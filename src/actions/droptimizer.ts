"use server"

import {
    Client,
    GatewayIntentBits,
    TextChannel,
    type FetchMessagesOptions,
    type Message,
} from "discord.js"
import { keyBy, partition } from "es-toolkit"
import { DateTime } from "luxon"
import pLimit from "p-limit"
import { match } from "ts-pattern"
import { characterRepo } from "@/db/repositories/characters"
import { droptimizerRepo } from "@/db/repositories/droptimizer"
import { itemRepo } from "@/db/repositories/items"
import { simcRepo } from "@/db/repositories/simc"
import { env } from "@/env"
import { safeAction } from "@/lib/errors/action-wrapper"
import { logger } from "@/lib/logger"
import { fetchDroptimizerFromQELiveURL } from "@/lib/server/qelive-parser"
import { fetchDroptimizerFromURL } from "@/lib/server/raidbots-parser"
import { parseSimC } from "@/lib/server/simc-parser"
import { s } from "@/shared/libs/string-utils"
import type { Item, ItemToCatalyst, ItemToTierset } from "@/shared/models/item.models"
import type { Droptimizer, SimC } from "@/shared/models/simulation.models"
import type { VoidResult } from "@/shared/types"

type DurationInput = { days?: number; hours?: number }

/**
 * Shared context containing pre-fetched reference data.
 * Passed through the parsing chain to avoid redundant DB queries.
 */
export type SyncContext = {
    itemsById: Map<number, Item>
    tiersetByItemId: Record<string, ItemToTierset>
    catalystByKey: Record<string, ItemToCatalyst>
    tiersetItemIds: Set<number>
}

/**
 * Build sync context by pre-fetching all reference data in parallel.
 * This is called once per sync batch instead of per URL.
 */
async function buildSyncContext(): Promise<SyncContext> {
    const [items, tiersetMapping, catalystMapping, tiersetItems] = await Promise.all([
        itemRepo.getAll(),
        itemRepo.getTiersetMapping(),
        itemRepo.getCatalystMapping(),
        itemRepo.getTiersetAndTokenList(),
    ])

    return {
        itemsById: new Map(items.map((i) => [i.id, i])),
        tiersetByItemId: keyBy(tiersetMapping, (i) => s(i.itemId)),
        catalystByKey: keyBy(
            catalystMapping,
            (i) => `${s(i.catalyzedItemId)}-${s(i.encounterId)}`
        ),
        tiersetItemIds: new Set(tiersetItems.map((i) => i.id)),
    }
}

/**
 * Resolve a character ID from name and realm.
 * Throws if character not found.
 */
async function resolveCharacterId(name: string, realm: string): Promise<string> {
    const character = await characterRepo.getByNameRealm(name, realm)
    if (!character) {
        throw new Error(`Character not found: ${name}-${realm}`)
    }
    return character.id
}

/**
 * Add a simulation from a URL (Raidbots or QE Live)
 * Returns an array because QE Live can contain multiple difficulties
 */
async function addFromUrl(url: string, context?: SyncContext): Promise<Droptimizer[]> {
    logger.info("Action", `Adding simulation from url ${url}`)

    const droptimizers = await match(url)
        .when(
            (u) => u.startsWith("https://questionablyepic.com/live/upgradereport/"),
            () => fetchDroptimizerFromQELiveURL(url, context)
        )
        .when(
            (u) => u.startsWith("https://www.raidbots.com/simbot/"),
            async () => [await fetchDroptimizerFromURL(url, context)]
        )
        .otherwise(() => {
            throw new Error("Invalid URL format for droptimizer")
        })

    const charIdMap = await characterRepo.getIdMapByNameRealm(
        droptimizers.map((d) => ({ name: d.charInfo.name, realm: d.charInfo.server }))
    )

    return Promise.all(
        droptimizers.map((dropt) => {
            const charKey = `${dropt.charInfo.name}-${dropt.charInfo.server}`
            const characterId = charIdMap.get(charKey)
            if (!characterId) {
                throw new Error(`Character not found: ${charKey}`)
            }
            return droptimizerRepo.add(dropt, characterId)
        })
    )
}

// ============== DISCORD HELPERS ==============

type DiscordMessage = {
    content: string
    createdAt: Date
}

/**
 * Read messages from a Discord channel since a cutoff date.
 * Stops fetching when messages are older than the cutoff (optimization).
 */
async function readDiscordMessagesSince(
    discordBotToken: string,
    discordChannelId: string,
    cutoffDate: Date
): Promise<DiscordMessage[]> {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ],
    })

    try {
        await client.login(discordBotToken)

        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Discord.js channel type
        const channel = (await client.channels.fetch(discordChannelId)) as TextChannel
        if (!channel.isTextBased()) {
            throw new Error("Channel not found or not a text channel")
        }

        const messages: Message[] = []
        let lastId: string | undefined
        let reachedCutoff = false

        while (!reachedCutoff) {
            const options: FetchMessagesOptions = { limit: 100 }
            if (lastId) {
                options.before = lastId
            }

            const fetchedMessages = await channel.messages.fetch(options)

            if (fetchedMessages.size === 0) {
                break
            }

            for (const msg of fetchedMessages.values()) {
                if (msg.createdAt < cutoffDate) {
                    reachedCutoff = true
                    break
                }
                messages.push(msg)
            }

            lastId = fetchedMessages.last()?.id
        }

        logger.info(
            "Discord",
            `Fetched ${s(messages.length)} messages since ${s(cutoffDate)}`
        )

        await client.destroy()

        return messages.map((msg) => ({
            content: msg.content,
            createdAt: msg.createdAt,
        }))
    } catch (error) {
        logger.error("Discord", `Error syncing from Discord: ${s(error)}`)
        await client.destroy()
        return []
    }
}

/**
 * Extract droptimizer URLs from Discord messages
 */
function extractUrlsFromMessages(
    messages: DiscordMessage[],
    lowerBoundDate: Date
): Set<string> {
    const raidbotsUrlRegex =
        /https:\/\/www\.raidbots\.com\/simbot\/report\/([a-zA-Z0-9]+)/g
    const qeLiveUrlRegex =
        /https:\/\/questionablyepic\.com\/live\/upgradereport\/([a-zA-Z0-9-_]+)/g

    return new Set(
        messages
            .filter((msg) => msg.createdAt >= lowerBoundDate)
            .flatMap((message) => {
                const raidbotsMatches = message.content.match(raidbotsUrlRegex) ?? []
                const qeLiveMatches = message.content.match(qeLiveUrlRegex) ?? []
                return [...raidbotsMatches, ...qeLiveMatches]
            })
    )
}

// ============== ACTIONS ==============

export const getDroptimizerLatestList = safeAction(async (): Promise<Droptimizer[]> => {
    return droptimizerRepo.getLatestList()
})

export const deleteDroptimizer = safeAction(async (id: string): Promise<void> => {
    await droptimizerRepo.delete(id)
})

export const deleteSimulationsOlderThan = safeAction(
    async (lookback: DurationInput): Promise<void> => {
        const cutoffDate = DateTime.now().minus(lookback)
        await droptimizerRepo.deleteOlderThanDate(cutoffDate.toUnixInteger())
    }
)

export const addSimC = safeAction(async (simcData: string): Promise<SimC> => {
    const { charName, charRealm, data } = await parseSimC(simcData)
    const characterId = await resolveCharacterId(charName, charRealm)
    return simcRepo.add(data, characterId)
})

export const addSimulationFromUrl = safeAction(
    async (url: string): Promise<Droptimizer[]> => {
        return addFromUrl(url)
    }
)

/**
 * Sync droptimizers from Discord channel
 * Fetches messages from the droptimizers channel and imports any URLs found
 *
 * Performance optimizations:
 * 1. Date-filtered Discord fetching - stops when messages are older than cutoff
 * 2. URL deduplication - skips URLs already imported recently
 * 3. Shared reference data - pre-fetches items/tierset/catalyst once for all URLs
 * 4. Increased concurrency - processes 10 URLs in parallel
 */
export const syncDroptimizersFromDiscord = safeAction(
    async (
        lookback: DurationInput
    ): Promise<{ imported: number; skipped: number; errors: string[] }> => {
        const botKey = env.DISCORD_BOT_TOKEN
        const channelId = env.DISCORD_DROPTIMIZER_CHANNEL_ID
        const cutoffDate = DateTime.now().minus(lookback).toJSDate()
        const cutoffUnixTs = Math.floor(cutoffDate.getTime() / 1000)

        // Optimization 1: Only fetch messages since cutoff date (stops early)
        const messages = await readDiscordMessagesSince(botKey, channelId, cutoffDate)

        const uniqueUrls = extractUrlsFromMessages(messages, cutoffDate)

        logger.info(
            "Action",
            `Found ${s(uniqueUrls.size)} unique valid URLs since ${s(cutoffDate)}`
        )

        // Optimization 2: Filter out URLs already imported recently
        const existingUrls = await droptimizerRepo.getExistingUrls(
            Array.from(uniqueUrls),
            cutoffUnixTs
        )
        const newUrls = Array.from(uniqueUrls).filter((url) => !existingUrls.has(url))
        const skippedCount = uniqueUrls.size - newUrls.length

        logger.info(
            "Action",
            `Skipping ${s(skippedCount)} already imported URLs, processing ${s(newUrls.length)} new URLs`
        )

        if (newUrls.length === 0) {
            return { imported: 0, skipped: skippedCount, errors: [] }
        }

        // Optimization 3: Pre-fetch all reference data once
        const syncContext = await buildSyncContext()

        // Optimization 4: Increased concurrency (10 instead of 5)
        const limit = pLimit(10)

        const results = await Promise.all(
            newUrls.map((url) =>
                limit(async (): Promise<VoidResult> => {
                    try {
                        await addFromUrl(url, syncContext)
                        return { success: true }
                    } catch (error) {
                        const errorMsg = `Failed to import ${url}: ${s(error)}`
                        logger.error("Action", errorMsg)
                        return { success: false, error: errorMsg }
                    }
                })
            )
        )

        const [successes, failures] = partition(results, (r) => r.success)
        const errors = failures.map((r) => r.error)

        logger.info(
            "Action",
            `Discord sync completed: ${s(successes.length)} imported, ${s(skippedCount)} skipped, ${s(errors.length)} errors`
        )

        return { imported: successes.length, skipped: skippedCount, errors }
    }
)

import { partition } from "es-toolkit"
import { DateTime } from "luxon"
import pLimit from "p-limit"
import "server-only"
import { match } from "ts-pattern"
import { characterRepo } from "@/db/repositories/characters"
import { droptimizerRepo } from "@/db/repositories/droptimizer"
import { simcRepo } from "@/db/repositories/simc"
import { env } from "@/env"
import { logger } from "@/lib/logger"
import {
    extractUrlsFromMessages,
    readAllMessagesInDiscord,
} from "@/services/discord/discord"
import { fetchDroptimizerFromQELiveURL } from "@/services/droptimizer/qelive-parser"
import { fetchDroptimizerFromURL } from "@/services/droptimizer/raidbots-parser"
import { parseSimC } from "@/services/simc/simc-parser"
import { s } from "@/shared/libs/safe-stringify"
import type { Droptimizer, NewDroptimizer, SimC } from "@/shared/models/simulation.model"
import type { WowRaidDifficulty } from "@/shared/models/wow.model"
import type { VoidResult } from "@/shared/types/types"

type DurationInput = { days?: number; hours?: number }

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

export const droptimizerService = {
    getList: async (): Promise<Droptimizer[]> => {
        return droptimizerRepo.getList()
    },

    getLatestList: async (): Promise<Droptimizer[]> => {
        return droptimizerRepo.getLatestList()
    },

    delete: async (id: string): Promise<void> => {
        await droptimizerRepo.delete(id)
    },

    getByCharacterIdAndDiff: async (
        characterId: string,
        raidDiff: WowRaidDifficulty
    ): Promise<Droptimizer | null> => {
        return droptimizerRepo.getByCharacterIdAndDiff(characterId, raidDiff)
    },

    add: async (
        droptimizer: NewDroptimizer,
        characterId: string
    ): Promise<Droptimizer> => {
        return droptimizerRepo.add(droptimizer, characterId)
    },

    /**
     * Delete simulations older than the specified duration
     */
    deleteOlderThan: async (lookback: DurationInput): Promise<void> => {
        const cutoffDate = DateTime.now().minus(lookback)
        await droptimizerRepo.deleteOlderThanDate(cutoffDate.toUnixInteger())
    },

    /**
     * Add SimC character data (for vault/tierset info without running a full droptimizer)
     */
    addSimC: async (simcData: string): Promise<SimC> => {
        const { charName, charRealm, data } = await parseSimC(simcData)
        const characterId = await resolveCharacterId(charName, charRealm)
        return simcRepo.add(data, characterId)
    },

    /**
     * Add a simulation from a URL (Raidbots or QE Live)
     * Returns an array because QE Live can contain multiple difficulties
     */
    addFromUrl: async (url: string): Promise<Droptimizer[]> => {
        logger.info("DroptimizerService", `Adding simulation from url ${url}`)

        const droptimizers = await match(url)
            .when(
                (u) => u.startsWith("https://questionablyepic.com/live/upgradereport/"),
                () => fetchDroptimizerFromQELiveURL(url)
            )
            .when(
                (u) => u.startsWith("https://www.raidbots.com/simbot/"),
                async () => [await fetchDroptimizerFromURL(url)]
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
    },

    /**
     * Sync droptimizers from Discord channel
     * Fetches all messages from the droptimizers channel and imports any URLs found
     */
    syncFromDiscord: async (
        lookback: DurationInput
    ): Promise<{ imported: number; errors: string[] }> => {
        const botKey = env.DISCORD_BOT_TOKEN
        const channelId = env.DISCORD_DROPTIMIZER_CHANNEL_ID

        const messages = await readAllMessagesInDiscord(botKey, channelId)
        const cutoffDate = DateTime.now().minus(lookback).toJSDate()

        const uniqueUrls = extractUrlsFromMessages(messages, cutoffDate)

        logger.info(
            "DroptimizerService",
            `Found ${s(uniqueUrls.size)} unique valid URLs since ${s(cutoffDate)}`
        )

        // Process URLs with concurrency limit, returning results
        const limit = pLimit(5)

        const results = await Promise.all(
            Array.from(uniqueUrls).map((url) =>
                limit(async (): Promise<VoidResult> => {
                    try {
                        await droptimizerService.addFromUrl(url)
                        return { success: true }
                    } catch (error) {
                        const errorMsg = `Failed to import ${url}: ${s(error)}`
                        logger.error("DroptimizerService", errorMsg)
                        return { success: false, error: errorMsg }
                    }
                })
            )
        )

        const [successes, failures] = partition(results, (r) => r.success)
        const errors = failures.map((r) => r.error)

        logger.info(
            "DroptimizerService",
            `Discord sync completed: ${s(successes.length)} imported, ${s(errors.length)} errors`
        )

        return { imported: successes.length, errors }
    },
}

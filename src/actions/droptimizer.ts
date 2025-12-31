"use server"

import { partition } from "es-toolkit"
import { DateTime } from "luxon"
import pLimit from "p-limit"
import { match } from "ts-pattern"
import { z } from "zod"
import { characterRepo } from "@/db/repositories/characters"
import { droptimizerRepo } from "@/db/repositories/droptimizer"
import { simcRepo, type NewSimC } from "@/db/repositories/simc"
import { env } from "@/env"
import { extractUrlsFromMessages, readAllMessagesInDiscord } from "@/lib/discord/discord"
import { fetchDroptimizerFromQELiveURL } from "@/lib/droptimizer/qelive-parser"
import { fetchDroptimizerFromURL } from "@/lib/droptimizer/raidbots-parser"
import { logger } from "@/lib/logger"
import { authActionClient } from "@/lib/safe-action"
import { s } from "@/lib/safe-stringify"
import { parseSimC } from "@/lib/simc/simc-parser"
import type { Droptimizer, NewDroptimizer } from "@/shared/models/simulation.model"
import type { WowRaidDifficulty } from "@/shared/models/wow.model"

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

export async function getDroptimizerList(): Promise<Droptimizer[]> {
    return await droptimizerRepo.getList()
}

export async function getDroptimizerLatestList(): Promise<Droptimizer[]> {
    return await droptimizerRepo.getLatestList()
}

export const deleteDroptimizer = authActionClient
    .inputSchema(z.object({ id: z.uuid() }))
    .action(async ({ parsedInput }) => {
        await droptimizerRepo.delete(parsedInput.id)
    })

export async function getDroptimizerByCharacterIdAndDiff(
    characterId: string,
    raidDiff: WowRaidDifficulty
): Promise<Droptimizer | null> {
    return await droptimizerRepo.getByCharacterIdAndDiff(characterId, raidDiff)
}

export async function addDroptimizer(
    droptimizer: NewDroptimizer,
    characterId: string
): Promise<Droptimizer> {
    return await droptimizerRepo.add(droptimizer, characterId)
}

const durationInputSchema = z.object({
    days: z.number().optional(),
    hours: z.number().optional(),
})

type DurationInput = z.infer<typeof durationInputSchema>

/**
 * Internal: Delete simulations older than the specified duration
 * Used by cron routes and the auth-protected action
 */
export async function deleteSimulationsOlderThanInternal(
    lookback: DurationInput
): Promise<void> {
    const cutoffDate = DateTime.now().minus(lookback)
    await droptimizerRepo.deleteOlderThanDate(cutoffDate.toUnixInteger())
}

/**
 * Delete simulations older than the specified duration
 * @param lookback - Duration object (e.g., { hours: 12 } or { days: 7 })
 */
export const deleteSimulationsOlderThan = authActionClient
    .inputSchema(z.object({ lookback: durationInputSchema }))
    .action(async ({ parsedInput }) => {
        await deleteSimulationsOlderThanInternal(parsedInput.lookback)
    })

/**
 * Add SimC character data (for vault/tierset info without running a full droptimizer)
 */
export const addSimC = authActionClient
    .inputSchema(z.object({ simcData: z.string().min(1) }))
    .action(async ({ parsedInput }) => {
        const simc: NewSimC = await parseSimC(parsedInput.simcData)
        const characterId = await resolveCharacterId(simc.charName, simc.charRealm)
        return await simcRepo.add(simc, characterId)
    })

/**
 * Internal function to add a simulation from a URL (used by both action and sync)
 */
async function addSimulationFromUrlInternal(url: string): Promise<Droptimizer[]> {
    logger.info("Droptimizer", `Adding simulation from url ${url}`)

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
}

/**
 * Add a simulation from a URL (Raidbots or QE Live)
 * Returns an array because QE Live can contain multiple difficulties
 */
export const addSimulationFromUrl = authActionClient
    .inputSchema(z.object({ url: z.url() }))
    .action(async ({ parsedInput }) => {
        return addSimulationFromUrlInternal(parsedInput.url)
    })

type UrlImportResult = { success: true } | { success: false; error: string }

/**
 * Internal: Sync droptimizers from Discord channel
 * Used by cron routes and the auth-protected action
 */
export async function syncDroptimizersFromDiscordInternal(
    lookback: DurationInput
): Promise<{ imported: number; errors: string[] }> {
    const botKey = env.DISCORD_BOT_TOKEN
    const channelId = env.DISCORD_DROPTIMIZER_CHANNEL_ID

    const messages = await readAllMessagesInDiscord(botKey, channelId)
    const cutoffDate = DateTime.now().minus(lookback).toJSDate()

    const uniqueUrls = extractUrlsFromMessages(messages, cutoffDate)

    logger.info(
        "Droptimizer",
        `Found ${s(uniqueUrls.size)} unique valid URLs since ${s(cutoffDate)}`
    )

    // Process URLs with concurrency limit, returning results
    const limit = pLimit(5)

    const results = await Promise.all(
        Array.from(uniqueUrls).map((url) =>
            limit(async (): Promise<UrlImportResult> => {
                try {
                    await addSimulationFromUrlInternal(url)
                    return { success: true }
                } catch (error) {
                    const errorMsg = `Failed to import ${url}: ${s(error)}`
                    logger.error("Droptimizer", errorMsg)
                    return { success: false, error: errorMsg }
                }
            })
        )
    )

    const [successes, failures] = partition(results, (r) => r.success)
    const errors = failures.map((r) => (r as { success: false; error: string }).error)

    logger.info(
        "Droptimizer",
        `Discord sync completed: ${s(successes.length)} imported, ${s(errors.length)} errors`
    )

    return { imported: successes.length, errors }
}

/**
 * Sync droptimizers from Discord channel
 * Fetches all messages from the droptimizers channel and imports any URLs found
 * @param lookback - Duration object (e.g., { hours: 12 } or { days: 7 })
 */
export const syncDroptimizersFromDiscord = authActionClient
    .inputSchema(z.object({ lookback: durationInputSchema }))
    .action(async ({ parsedInput }) => {
        return syncDroptimizersFromDiscordInternal(parsedInput.lookback)
    })

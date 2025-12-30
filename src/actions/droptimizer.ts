"use server"

import { Duration } from "luxon"
import pLimit from "p-limit"
import { characterRepo } from "@/db/repositories/characters"
import { droptimizerRepo } from "@/db/repositories/droptimizer"
import { simcRepo, type NewSimC } from "@/db/repositories/simc"
import { env } from "@/env"
import { fetchDroptimizerFromQELiveURL } from "@/lib/droptimizer/qelive-parser"
import { fetchDroptimizerFromURL } from "@/lib/droptimizer/raidbots-parser"
import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"
import { parseSimC } from "@/lib/simc/simc-parser"
import { getUnixTimestamp } from "@/shared/libs/date/date-utils"
import type { Droptimizer, NewDroptimizer, SimC } from "@/shared/models/simulation.model"
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

export async function deleteDroptimizer(id: string): Promise<void> {
    await droptimizerRepo.delete(id)
}

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

export async function deleteSimulationsOlderThan(lookback: Duration): Promise<void> {
    const currentTimeStamp = getUnixTimestamp()
    const cutoffTimestamp = currentTimeStamp - (lookback.as("seconds") || 0)
    await droptimizerRepo.deleteOlderThanDate(cutoffTimestamp)
}

/**
 * Add SimC character data (for vault/tierset info without running a full droptimizer)
 */
export async function addSimC(simcData: string): Promise<SimC> {
    const simc: NewSimC = await parseSimC(simcData)
    const characterId = await resolveCharacterId(simc.charName, simc.charRealm)
    return await simcRepo.add(simc, characterId)
}

/**
 * Add a simulation from a URL (Raidbots or QE Live)
 */
export async function addSimulationFromUrl(url: string): Promise<Droptimizer[]> {
    logger.info("Droptimizer", `Adding simulation from url ${url}`)
    const results: Droptimizer[] = []

    if (url.startsWith("https://questionablyepic.com/live/upgradereport/")) {
        // QE Live report: healers
        const droptimizers: NewDroptimizer[] = await fetchDroptimizerFromQELiveURL(url)
        for (const dropt of droptimizers) {
            const characterId = await resolveCharacterId(
                dropt.charInfo.name,
                dropt.charInfo.server
            )
            const result = await droptimizerRepo.add(dropt, characterId)
            results.push(result)
        }
    } else if (url.startsWith("https://www.raidbots.com/simbot/")) {
        // If the URL is a Raidbots simbot, fetch it
        const droptimizer: NewDroptimizer = await fetchDroptimizerFromURL(url)
        const characterId = await resolveCharacterId(
            droptimizer.charInfo.name,
            droptimizer.charInfo.server
        )
        const result = await droptimizerRepo.add(droptimizer, characterId)
        results.push(result)
    } else {
        throw new Error("Invalid URL format for droptimizer")
    }

    return results
}

/**
 * Sync droptimizers from Discord channel
 * Fetches all messages from the droptimizers channel and imports any URLs found
 */
export async function syncDroptimizersFromDiscord(
    lookback: Duration
): Promise<{ imported: number; errors: string[] }> {
    // Dynamic import to avoid loading discord.js on client
    const { readAllMessagesInDiscord, extractUrlsFromMessages } =
        await import("@/lib/discord/discord")

    const botKey = env.DISCORD_BOT_TOKEN
    const channelId = env.DISCORD_DROPTIMIZER_CHANNEL_ID

    const messages = await readAllMessagesInDiscord(botKey, channelId)
    const cutoffTimestamp = getUnixTimestamp() - (lookback.as("seconds") || 0)
    const cutoffDate = new Date(cutoffTimestamp * 1000)

    const uniqueUrls = extractUrlsFromMessages(messages, cutoffDate)

    logger.info(
        "Droptimizer",
        `Found ${s(uniqueUrls.size)} unique valid URLs since ${s(cutoffDate)}`
    )

    const errors: string[] = []
    let importedCount = 0

    // Process URLs with concurrency limit
    const limit = pLimit(5)

    await Promise.all(
        Array.from(uniqueUrls).map((url) =>
            limit(async () => {
                try {
                    await addSimulationFromUrl(url)
                    importedCount++
                } catch (error) {
                    const errorMsg = `Failed to import ${url}: ${error instanceof Error ? error.message : "Unknown error"}`
                    logger.error("Droptimizer", errorMsg)
                    errors.push(errorMsg)
                }
            })
        )
    )

    logger.info(
        "Droptimizer",
        `Discord sync completed: ${s(importedCount)} imported, ${s(errors.length)} errors`
    )

    return { imported: importedCount, errors }
}

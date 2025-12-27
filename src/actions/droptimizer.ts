"use server"

import pLimit from "p-limit"

import { droptimizerRepo } from "@/db/repositories/droptimizer"
import { settingsRepo } from "@/db/repositories/settings"
import { simcRepo } from "@/db/repositories/simc"
import { env } from "@/env"
import { fetchDroptimizerFromQELiveURL } from "@/lib/droptimizer/qelive-parser"
import { fetchDroptimizerFromURL } from "@/lib/droptimizer/raidbots-parser"
import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"
import { parseSimC } from "@/lib/simc/simc-parser"
import { getUnixTimestamp } from "@/shared/libs/date/date-utils"
import type {
    Droptimizer,
    NewDroptimizer,
    SimC,
    WowRaidDifficulty,
} from "@/shared/types/types"

export async function getDroptimizerList(): Promise<Droptimizer[]> {
    return await droptimizerRepo.getList()
}

export async function getDroptimizerLatestList(): Promise<Droptimizer[]> {
    return await droptimizerRepo.getLatestList()
}

export async function deleteDroptimizer(url: string): Promise<void> {
    await droptimizerRepo.delete(url)
}

export async function getDroptimizerLastByCharAndDiff(
    charName: string,
    charRealm: string,
    raidDiff: WowRaidDifficulty
): Promise<Droptimizer | null> {
    return await droptimizerRepo.getLastByCharAndDiff(charName, charRealm, raidDiff)
}

export async function addDroptimizer(droptimizer: NewDroptimizer): Promise<Droptimizer> {
    return await droptimizerRepo.add(droptimizer)
}

export async function deleteSimulationsOlderThanHours(hours: number): Promise<void> {
    const currentTimeStamp = getUnixTimestamp()
    const upperBound = currentTimeStamp - hours * 60 * 60
    await droptimizerRepo.deleteOlderThanDate(upperBound)
}

/**
 * Add SimC character data (for vault/tierset info without running a full droptimizer)
 */
export async function addSimC(simcData: string): Promise<SimC> {
    const simc = await parseSimC(simcData)
    await simcRepo.add(simc)
    return simc
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
            const result = await droptimizerRepo.add(dropt)
            results.push(result)
        }
    } else if (url.startsWith("https://www.raidbots.com/simbot/")) {
        // If the URL is a Raidbots simbot, fetch it
        const droptimizer: NewDroptimizer = await fetchDroptimizerFromURL(url)
        const result = await droptimizerRepo.add(droptimizer)
        results.push(result)
    } else {
        throw new Error("Invalid URL format for droptimizer")
    }

    return results
}

export async function getDiscordBotToken(): Promise<string | null> {
    return await settingsRepo.get("DISCORD_BOT_TOKEN")
}

/**
 * Sync droptimizers from Discord channel
 * Fetches all messages from the droptimizers channel and imports any URLs found
 */
export async function syncDroptimizersFromDiscord(
    hours: number
): Promise<{ imported: number; errors: string[] }> {
    // Dynamic import to avoid loading discord.js on client
    const { readAllMessagesInDiscord, extractUrlsFromMessages } =
        await import("@/lib/discord/discord")

    const botKey = await settingsRepo.get("DISCORD_BOT_TOKEN")
    const channelId = env.DISCORD_DROPTIMIZER_CHANNEL_ID

    if (!botKey) {
        throw new Error("DISCORD_BOT_TOKEN not set in database")
    }

    const messages = await readAllMessagesInDiscord(botKey, channelId)
    const upperBound = getUnixTimestamp() - hours * 60 * 60
    const lowerBoundDate = new Date(upperBound * 1000)

    const uniqueUrls = extractUrlsFromMessages(messages, lowerBoundDate)

    logger.info(
        "Droptimizer",
        `Found ${s(uniqueUrls.size)} unique valid URLs since ${s(lowerBoundDate)}`
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

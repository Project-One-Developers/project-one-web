"use server"

import {
    addDroptimizer,
    deleteDroptimizer,
    deleteDroptimizerOlderThanDate,
    getDroptimizerLastByCharAndDiff,
    getDroptimizerLatestList,
    getDroptimizerList,
} from "@/db/repositories/droptimizer"
import { getConfig } from "@/db/repositories/settings"
import { addSimC } from "@/db/repositories/simc"
import { fetchDroptimizerFromQELiveURL } from "@/lib/droptimizer/qelive-parser"
import { fetchDroptimizerFromURL } from "@/lib/droptimizer/raidbots-parser"
import { parseSimC } from "@/lib/simc/simc-parser"
import { getUnixTimestamp } from "@/shared/libs/date/date-utils"
import type {
    Droptimizer,
    NewDroptimizer,
    SimC,
    WowRaidDifficulty,
} from "@/shared/types/types"

export async function getDroptimizerListAction(): Promise<Droptimizer[]> {
    return await getDroptimizerList()
}

export async function getDroptimizerLatestListAction(): Promise<Droptimizer[]> {
    return await getDroptimizerLatestList()
}

export async function deleteDroptimizerAction(url: string): Promise<void> {
    return await deleteDroptimizer(url)
}

export async function getDroptimizerLastByCharAndDiffAction(
    charName: string,
    charRealm: string,
    raidDiff: WowRaidDifficulty
): Promise<Droptimizer | null> {
    return await getDroptimizerLastByCharAndDiff(charName, charRealm, raidDiff)
}

export async function addDroptimizerAction(
    droptimizer: NewDroptimizer
): Promise<Droptimizer> {
    return await addDroptimizer(droptimizer)
}

export async function deleteSimulationsOlderThanHoursAction(
    hours: number
): Promise<void> {
    const currentTimeStamp = getUnixTimestamp()
    const upperBound = currentTimeStamp - hours * 60 * 60
    await deleteDroptimizerOlderThanDate(upperBound)
}

/**
 * Add SimC character data (for vault/tierset info without running a full droptimizer)
 */
export async function addSimCAction(simcData: string): Promise<SimC> {
    const simc = await parseSimC(simcData)
    await addSimC(simc)
    return simc
}

/**
 * Add a simulation from a URL (Raidbots or QE Live)
 */
export async function addSimulationFromUrlAction(url: string): Promise<Droptimizer[]> {
    console.log("Adding simulation from url", url)
    const results: Droptimizer[] = []

    if (url.startsWith("https://questionablyepic.com/live/upgradereport/")) {
        // QE Live report: healers
        const droptimizers: NewDroptimizer[] = await fetchDroptimizerFromQELiveURL(url)
        for (const dropt of droptimizers) {
            const result = await addDroptimizer(dropt)
            results.push(result)
        }
    } else if (url.startsWith("https://www.raidbots.com/simbot/")) {
        // If the URL is a Raidbots simbot, fetch it
        const droptimizer: NewDroptimizer = await fetchDroptimizerFromURL(url)
        const result = await addDroptimizer(droptimizer)
        results.push(result)
    } else {
        throw new Error("Invalid URL format for droptimizer")
    }

    return results
}

export async function getDiscordBotToken(): Promise<string | null> {
    return await getConfig("DISCORD_BOT_TOKEN")
}

export async function getDiscordChannelId(): Promise<string> {
    // Hardcoded for now, can be moved to config
    return "1283383693695778878"
}

/**
 * Sync droptimizers from Discord channel
 * Fetches all messages from the droptimizers channel and imports any URLs found
 */
export async function syncDroptimizersFromDiscordAction(
    hours: number
): Promise<{ imported: number; errors: string[] }> {
    // Dynamic import to avoid loading discord.js on client
    const { readAllMessagesInDiscord, extractUrlsFromMessages } =
        await import("@/lib/discord/discord")

    const botKey = await getConfig("DISCORD_BOT_TOKEN")
    const channelId = await getDiscordChannelId()

    if (!botKey) {
        throw new Error("DISCORD_BOT_TOKEN not set in database")
    }

    const messages = await readAllMessagesInDiscord(botKey, channelId)
    const upperBound = getUnixTimestamp() - hours * 60 * 60
    const lowerBoundDate = new Date(upperBound * 1000)

    const uniqueUrls = extractUrlsFromMessages(messages, lowerBoundDate)

    console.log(`Found ${uniqueUrls.size} unique valid URLs since ${lowerBoundDate}`)

    const errors: string[] = []
    let importedCount = 0

    // Process URLs with concurrency limit
    const { default: pLimit } = await import("p-limit")
    const limit = pLimit(5)

    await Promise.all(
        Array.from(uniqueUrls).map((url) =>
            limit(async () => {
                try {
                    await addSimulationFromUrlAction(url)
                    importedCount++
                } catch (error) {
                    const errorMsg = `Failed to import ${url}: ${error instanceof Error ? error.message : "Unknown error"}`
                    console.error(errorMsg)
                    errors.push(errorMsg)
                }
            })
        )
    )

    console.log(
        `Discord sync completed: ${importedCount} imported, ${errors.length} errors`
    )

    return { imported: importedCount, errors }
}

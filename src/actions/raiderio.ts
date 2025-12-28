"use server"

import { partition } from "es-toolkit"
import pLimit from "p-limit"

import { characterRepo } from "@/db/repositories/characters"
import { raiderioRepo } from "@/db/repositories/raiderio"
import { logger } from "@/lib/logger"
import {
    fetchCharacterRaidProgress,
    parseRaiderioData,
    resetItemsCache,
} from "@/lib/raiderio/raiderio-sync"
import { s } from "@/lib/safe-stringify"
import {
    formaUnixTimestampToItalianDate,
    getUnixTimestamp,
} from "@/shared/libs/date/date-utils"
import type { CharacterRaiderio } from "@/shared/schemas/raiderio.schemas"

/**
 * Sync all characters' Raider.io data
 * Fetches raid progress and equipped items for all roster characters
 */
type SyncResult = { ok: true; data: CharacterRaiderio } | { ok: false; error: string }

export async function syncAllCharactersRaiderio(): Promise<{
    synced: number
    errors: string[]
}> {
    logger.info("Raiderio", "Start Full Sync")
    resetItemsCache()

    const roster = await characterRepo.getList()
    const limit = pLimit(10)

    const syncResults = await Promise.all(
        roster.map((character) =>
            limit(async (): Promise<SyncResult> => {
                try {
                    const raiderioData = await fetchCharacterRaidProgress(
                        character.name,
                        character.realm
                    )
                    const data = await parseRaiderioData(
                        character.name,
                        character.realm,
                        raiderioData
                    )
                    return { ok: true, data }
                } catch (err) {
                    const error = `Failed to sync ${character.name}-${character.realm}: ${s(err)}`
                    logger.error("Raiderio", error)
                    return { ok: false, error }
                }
            })
        )
    )

    const [successes, failures] = partition(syncResults, (r) => r.ok)
    const results = successes.map((r) => r.data)
    const errors = failures.map((r) => r.error)

    if (results.length > 0) {
        await raiderioRepo.upsert(results)
    }

    logger.info(
        "Raiderio",
        `Full Sync Completed: ${s(results.length)} synced, ${s(errors.length)} errors`
    )

    return { synced: results.length, errors }
}

/**
 * Sync a single character's Raider.io data
 */
export async function syncCharacterRaiderio(
    characterName: string,
    characterRealm: string
): Promise<void> {
    logger.info(
        "Raiderio",
        `Start Single Character Sync: ${characterName} - ${characterRealm}`
    )

    const raiderioData = await fetchCharacterRaidProgress(characterName, characterRealm)
    const result = await parseRaiderioData(characterName, characterRealm, raiderioData)

    await raiderioRepo.upsert([result])

    logger.info(
        "Raiderio",
        `Single Character Sync Completed: ${characterName} - ${characterRealm}`
    )
}

/**
 * Check if Raider.io data needs updating (based on last sync time)
 * Returns true if sync was performed, false if skipped
 */
export async function checkRaiderioUpdates(): Promise<{
    synced: boolean
    message: string
    result?: { synced: number; errors: string[] }
}> {
    logger.info("Raiderio", "checkRaiderioUpdates: checking..")
    const lastSync = await raiderioRepo.getLastTimeSynced()
    const frequencyTS = 1 * 60 * 60 // 1 hour in seconds

    if (lastSync === null || getUnixTimestamp() - lastSync > frequencyTS) {
        logger.info(
            "Raiderio",
            `checkRaiderioUpdates: raiderio needs to be updated (${
                lastSync !== null ? formaUnixTimestampToItalianDate(lastSync) : "never"
            }) - syncing now`
        )
        const result = await syncAllCharactersRaiderio()
        return {
            synced: true,
            message: `Synced ${s(result.synced)} characters`,
            result,
        }
    } else {
        const message = `Raiderio is up to date (last sync: ${formaUnixTimestampToItalianDate(lastSync)})`
        logger.info("Raiderio", `checkRaiderioUpdates: ${message}`)
        return { synced: false, message }
    }
}

/**
 * Get all stored Raider.io data
 */
export async function getAllCharacterRaiderio(): Promise<CharacterRaiderio[]> {
    return await raiderioRepo.getAll()
}

/**
 * Get the last sync timestamp
 */
export async function getLastRaiderioSyncTime(): Promise<number | null> {
    return await raiderioRepo.getLastTimeSynced()
}

// TODO: use enum or something better than a magic number as a filter
/**
 * Get roster progression data (characters with their Raider.io data)
 * @param filter 0 = all, 1 = mains only, 2 = alts only
 */
export async function getRosterProgression(filter = 0): Promise<
    {
        p1Character: Awaited<ReturnType<typeof characterRepo.getList>>[0]
        raiderIo: CharacterRaiderio | null
    }[]
> {
    // TODO: filter at db level?
    const roster = await characterRepo.getList()
    logger.info(
        "Raiderio",
        `Fetching roster progression for ${s(roster.length)} characters`
    )

    // Apply filter based on the parameter
    const filteredRoster = (() => {
        switch (filter) {
            case 1: // only mains
                return roster.filter((c) => c.main)
            case 2: // only alts
                return roster.filter((c) => !c.main)
            default: // no filter, get progress for all characters
                return roster
        }
    })()

    logger.info(
        "Raiderio",
        `After filtering: ${s(filteredRoster.length)} characters (filter: ${s(filter)})`
    )

    const allRaiderio = await raiderioRepo.getAll()

    const raiderioMap = new Map(allRaiderio.map((r) => [`${r.name}-${r.realm}`, r]))

    return filteredRoster.map((character) => {
        const key = `${character.name}-${character.realm}`
        return {
            p1Character: character,
            raiderIo: raiderioMap.get(key) ?? null,
        }
    })
}

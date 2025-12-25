"use server"

import { getCharactersList } from "@/db/repositories/characters"
import {
    addCharacterRaiderio,
    deleteAllCharacterRaiderio,
    getAllCharacterRaiderio,
    getLastTimeSyncedRaiderio,
    upsertCharacterRaiderio,
} from "@/db/repositories/raiderio"
import {
    fetchCharacterRaidProgress,
    parseRaiderioData,
    resetItemsCache,
} from "@/lib/raiderio/raiderio-sync"
import {
    formaUnixTimestampToItalianDate,
    getUnixTimestamp,
} from "@/shared/libs/date/date-utils"
import type { CharacterRaiderio } from "@/shared/schemas/raiderio.schemas"

/**
 * Sync all characters' Raider.io data
 * Fetches raid progress and equipped items for all roster characters
 */
export async function syncAllCharactersRaiderioAction(): Promise<{
    synced: number
    errors: string[]
}> {
    console.log("[Raiderio] Start Full Sync")
    resetItemsCache() // Reset cache for fresh data

    const roster = await getCharactersList()
    const errors: string[] = []
    const results: CharacterRaiderio[] = []

    // Fetch data for all characters in parallel
    await Promise.all(
        roster.map(async (character) => {
            try {
                const raiderioData = await fetchCharacterRaidProgress(
                    character.name,
                    character.realm
                )
                const parsed = await parseRaiderioData(
                    character.name,
                    character.realm,
                    raiderioData
                )
                results.push(parsed)
            } catch (error) {
                const errorMsg = `Failed to sync ${character.name}-${character.realm}: ${error instanceof Error ? error.message : "Unknown error"}`
                console.error(errorMsg)
                errors.push(errorMsg)
            }
        })
    )

    if (results.length > 0) {
        await deleteAllCharacterRaiderio()
        await addCharacterRaiderio(results)
    }

    console.log(
        `[Raiderio] Full Sync Completed: ${results.length} synced, ${errors.length} errors`
    )

    return { synced: results.length, errors }
}

/**
 * Sync a single character's Raider.io data
 */
export async function syncCharacterRaiderioAction(
    characterName: string,
    characterRealm: string
): Promise<void> {
    console.log(
        `[Raiderio] Start Single Character Sync: ${characterName} - ${characterRealm}`
    )

    const raiderioData = await fetchCharacterRaidProgress(characterName, characterRealm)
    const result = await parseRaiderioData(characterName, characterRealm, raiderioData)

    await upsertCharacterRaiderio([result])

    console.log(
        `[Raiderio] Single Character Sync Completed: ${characterName} - ${characterRealm}`
    )
}

/**
 * Check if Raider.io data needs updating (based on last sync time)
 * Returns true if sync was performed, false if skipped
 */
export async function checkRaiderioUpdatesAction(): Promise<{
    synced: boolean
    message: string
    result?: { synced: number; errors: string[] }
}> {
    console.log("checkRaiderioUpdates: checking..")
    const lastSync = await getLastTimeSyncedRaiderio()
    const frequencyTS = 1 * 60 * 60 // 1 hour in seconds

    if (lastSync === null || getUnixTimestamp() - lastSync > frequencyTS) {
        console.log(
            "checkRaiderioUpdates: raiderio needs to be updated (" +
                (lastSync != null ? formaUnixTimestampToItalianDate(lastSync) : "never") +
                ") - syncing now"
        )
        const result = await syncAllCharactersRaiderioAction()
        return {
            synced: true,
            message: `Synced ${result.synced} characters`,
            result,
        }
    } else {
        const message = `Raiderio is up to date (last sync: ${formaUnixTimestampToItalianDate(lastSync)})`
        console.log("checkRaiderioUpdates: " + message)
        return { synced: false, message }
    }
}

/**
 * Get all stored Raider.io data
 */
export async function getAllCharacterRaiderioAction(): Promise<CharacterRaiderio[]> {
    return await getAllCharacterRaiderio()
}

/**
 * Get the last sync timestamp
 */
export async function getLastRaiderioSyncTimeAction(): Promise<number | null> {
    return await getLastTimeSyncedRaiderio()
}

/**
 * Get roster progression data (characters with their Raider.io data)
 * @param filter 0 = all, 1 = mains only, 2 = alts only
 */
export async function getRosterProgressionAction(filter: number = 0): Promise<
    {
        p1Character: Awaited<ReturnType<typeof getCharactersList>>[0]
        raiderIo: CharacterRaiderio | null
    }[]
> {
    const roster = await getCharactersList()
    console.log(`Fetching roster progression for ${roster.length} characters`)

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

    console.log(
        `After filtering: ${filteredRoster.length} characters (filter: ${filter})`
    )

    const allRaiderio = await getAllCharacterRaiderio()

    return filteredRoster.map((character) => {
        // Find matching raiderio data based on name and realm
        const matchingRaiderio = allRaiderio.find(
            (raiderio) =>
                raiderio.name === character.name && raiderio.realm === character.realm
        )

        return {
            p1Character: character,
            raiderIo: matchingRaiderio || null,
        }
    })
}

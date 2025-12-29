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
import type { CharacterWithEncounters } from "@/shared/models/character.model"
import type { CharacterRaiderio } from "@/shared/models/raiderio.model"

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

/**
 * Get roster progression data with pre-built encounter lookup maps.
 * Single DB query with LEFT JOIN, server-side preprocessing of encounters.
 */
export async function getRosterProgression(
    showMains = true,
    showAlts = true,
    raidSlug: string
): Promise<CharacterWithEncounters[]> {
    const roster = await characterRepo.getListWithRaiderio(showMains, showAlts)
    logger.info(
        "Raiderio",
        `Fetching roster progression for ${s(roster.length)} characters (mains: ${s(showMains)}, alts: ${s(showAlts)}, raid: ${raidSlug})`
    )

    const difficulties = ["normal", "heroic", "mythic"] as const

    return roster.map(({ progress, ...character }) => {
        const currentRaid = progress?.raidProgress.find((rp) => rp.raid === raidSlug)

        const encounters = Object.fromEntries(
            difficulties.flatMap((diff) =>
                (currentRaid?.encountersDefeated[diff] ?? []).map(
                    (enc) => [`${diff}-${enc.slug}`, enc] as const
                )
            )
        )

        return {
            p1Character: {
                id: character.id,
                name: character.name,
                realm: character.realm,
                class: character.class,
                role: character.role,
                main: character.main,
                playerId: character.playerId,
            },
            encounters,
        }
    })
}

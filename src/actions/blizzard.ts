"use server"

import { groupBy, keyBy, partition } from "es-toolkit"
import { match } from "ts-pattern"
import { blizzardRepo, type CharacterBlizzardDb } from "@/db/repositories/blizzard"
import { bossRepo } from "@/db/repositories/bosses"
import { characterRepo } from "@/db/repositories/characters"
import { playerRepo } from "@/db/repositories/player.repo"
import { fetchGuildRoster, realmSlugToName } from "@/lib/blizzard/blizzard-api"
import {
    fetchAndParseCharacter,
    resetItemsCache,
    resetFetchedInstancesCache,
    type ParsedBlizzardData,
} from "@/lib/blizzard/blizzard-sync"
import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"
import { defined } from "@/lib/utils"
import {
    formaUnixTimestampToItalianDate,
    getUnixTimestamp,
} from "@/shared/libs/date/date-utils"
import type { BlizzardEncounter } from "@/shared/models/blizzard.model"
import type { Boss } from "@/shared/models/boss.model"
import type { CharacterWithEncounters } from "@/shared/models/character.model"
import type { WowClassName } from "@/shared/models/wow.model"
import type { Result } from "@/shared/types/types"

// ============================================================================
// Guild Import Config (hardcoded for now)
// ============================================================================

const GUILD_CONFIG = {
    name: "Project One",
    realm: "pozzo-delleternità", // Use slug directly for API
    realmDisplay: "Pozzo dell'Eternità", // For display/DB storage
    // Rank indices to import (0=GM, 1=Officer, 3=Raider, 5=Trial)
    importRanks: [0, 1, 3, 5],
}

const mapBlizzardClass = (classId: number) =>
    match<number, WowClassName | null>(classId)
        .with(1, () => "Warrior")
        .with(2, () => "Paladin")
        .with(3, () => "Hunter")
        .with(4, () => "Rogue")
        .with(5, () => "Priest")
        .with(6, () => "Death Knight")
        .with(7, () => "Shaman")
        .with(8, () => "Mage")
        .with(9, () => "Warlock")
        .with(10, () => "Monk")
        .with(11, () => "Druid")
        .with(12, () => "Demon Hunter")
        .with(13, () => "Evoker")
        .otherwise(() => null)

/**
 * Sync all characters' Blizzard API data
 * Fetches profile, equipment, and raid progress for all roster characters
 */
export async function syncAllCharactersBlizzard(): Promise<{
    synced: number
    errors: string[]
}> {
    logger.info("Blizzard", "Start Full Sync")
    resetItemsCache()
    resetFetchedInstancesCache()

    const roster = await characterRepo.getList()

    // Build boss lookup (blizzardEncounterId -> boss)
    const allBosses = await bossRepo.getAll()
    const bossLookup = keyBy(
        allBosses.filter(
            (boss): boss is Boss & { blizzardEncounterId: number } =>
                boss.blizzardEncounterId !== null
        ),
        (boss) => boss.blizzardEncounterId
    )

    // Blizzard API rate limiting is handled in blizzard-api.ts (10 concurrent)
    const syncResults = await Promise.all(
        roster.map(async (character): Promise<Result<ParsedBlizzardData>> => {
            try {
                const data = await fetchAndParseCharacter(
                    character.id, // FK to charTable
                    character.name,
                    character.realm,
                    bossLookup
                )
                if (!data) {
                    return {
                        success: false,
                        error: `Failed to fetch ${character.name}-${character.realm}: No data returned`,
                    }
                }
                return { success: true, data }
            } catch (err) {
                const error = `Failed to sync ${character.name}-${character.realm}: ${s(err)}`
                logger.error("Blizzard", error)
                return { success: false, error }
            }
        })
    )

    const [successes, failures] = partition(syncResults, (r) => r.success)
    const results = successes.map((r) => r.data)
    const errors = failures.map((r) => r.error)

    if (results.length > 0) {
        const characters = results.map((r) => r.character)
        const encountersByCharacter = Object.fromEntries(
            results.map((r) => [r.character.characterId, r.encounters])
        )

        await Promise.all([
            blizzardRepo.upsert(characters),
            blizzardRepo.upsertAllEncounters(encountersByCharacter),
        ])
    }

    logger.info(
        "Blizzard",
        `Full Sync Completed: ${s(results.length)} synced, ${s(errors.length)} errors`
    )

    return { synced: results.length, errors }
}

/**
 * Sync a single character's Blizzard API data
 */
export async function syncCharacterBlizzard(
    characterId: string,
    characterName: string,
    characterRealm: string
): Promise<void> {
    logger.info(
        "Blizzard",
        `Start Single Character Sync: ${characterName} - ${characterRealm}`
    )

    // Build boss lookup
    const allBosses = await bossRepo.getAll()
    const bossLookup = keyBy(
        allBosses.filter(
            (boss): boss is Boss & { blizzardEncounterId: number } =>
                boss.blizzardEncounterId !== null
        ),
        (boss) => boss.blizzardEncounterId
    )

    const result = await fetchAndParseCharacter(
        characterId,
        characterName,
        characterRealm,
        bossLookup
    )

    if (!result) {
        throw new Error(`Failed to fetch data for ${characterName}-${characterRealm}`)
    }

    await blizzardRepo.upsert([result.character])
    await blizzardRepo.upsertEncounters(characterId, result.encounters)

    logger.info(
        "Blizzard",
        `Single Character Sync Completed: ${characterName} - ${characterRealm}`
    )
}

/**
 * Check if Blizzard data needs updating (based on last sync time)
 * Returns true if sync was performed, false if skipped
 */
export async function checkBlizzardUpdates(): Promise<{
    synced: boolean
    message: string
    result?: { synced: number; errors: string[] }
}> {
    logger.info("Blizzard", "checkBlizzardUpdates: checking..")
    const lastSync = await blizzardRepo.getLastTimeSynced()
    const frequencyTS = 1 * 60 * 60 // 1 hour in seconds

    if (lastSync === null || getUnixTimestamp() - lastSync > frequencyTS) {
        logger.info(
            "Blizzard",
            `checkBlizzardUpdates: Blizzard data needs to be updated (${
                lastSync !== null ? formaUnixTimestampToItalianDate(lastSync) : "never"
            }) - syncing now`
        )
        const result = await syncAllCharactersBlizzard()
        return {
            synced: true,
            message: `Synced ${s(result.synced)} characters`,
            result,
        }
    } else {
        const message = `Blizzard data is up to date (last sync: ${formaUnixTimestampToItalianDate(lastSync)})`
        logger.info("Blizzard", `checkBlizzardUpdates: ${message}`)
        return { synced: false, message }
    }
}

/**
 * Get all stored Blizzard data
 */
export async function getAllCharacterBlizzard(): Promise<CharacterBlizzardDb[]> {
    return await blizzardRepo.getAll()
}

/**
 * Get the last sync timestamp
 */
export async function getLastBlizzardSyncTime(): Promise<number | null> {
    return await blizzardRepo.getLastTimeSynced()
}

/**
 * Get roster progression data with encounters from normalized table.
 */
export async function getRosterProgression(
    showMains = true,
    showAlts = true,
    raidSlug: string
): Promise<CharacterWithEncounters[]> {
    const roster = await characterRepo.getList(showMains, showAlts)
    logger.info(
        "Blizzard",
        `Fetching roster progression for ${s(roster.length)} characters (mains: ${s(showMains)}, alts: ${s(showAlts)}, raid: ${raidSlug})`
    )

    if (roster.length === 0) {
        return []
    }

    // Get encounters for all roster characters
    const characterIds = roster.map((c) => c.id)
    const allEncounters = await blizzardRepo.getEncountersForRoster(
        characterIds,
        raidSlug
    )

    // Group encounters by character ID
    const encountersByCharacter = groupBy(allEncounters, (enc) => enc.characterId)

    return roster.map((character) => {
        const charEncounters = encountersByCharacter[character.id] ?? []

        // Build encounter lookup: "Difficulty-blizzardEncounterId" -> encounter
        const encounters = Object.fromEntries(
            charEncounters
                .map((enc): [string, BlizzardEncounter] | null => {
                    const encounterId = enc.boss.blizzardEncounterId
                    if (!encounterId) {
                        return null
                    }
                    return [
                        `${enc.difficulty}-${s(encounterId)}`,
                        {
                            encounterId,
                            numKills: enc.numKills,
                            lastDefeated: enc.lastDefeated?.toISOString() ?? null,
                        },
                    ]
                })
                .filter(defined)
        )

        return {
            p1Character: character,
            encounters,
        }
    })
}

// ============================================================================
// Guild Import
// ============================================================================

/**
 * Import guild members from Blizzard API.
 * - Fetches guild roster
 * - Filters by configured ranks (GM, Officer, Raider, Trial - skipping Officer Alt)
 * - Creates player + character for new members
 * - Skips existing characters (by name-realm)
 */
export async function importGuildMembers(): Promise<{
    imported: number
    skipped: number
    errors: string[]
}> {
    logger.info(
        "Blizzard",
        `Importing guild members from ${GUILD_CONFIG.name}-${GUILD_CONFIG.realm}`
    )

    const roster = await fetchGuildRoster(GUILD_CONFIG.name, GUILD_CONFIG.realm)
    if (!roster) {
        throw new Error("Failed to fetch guild roster from Blizzard API")
    }

    logger.info("Blizzard", `Found ${s(roster.members.length)} total guild members`)

    // Filter by allowed ranks
    const allowedMembers = roster.members.filter((m) =>
        GUILD_CONFIG.importRanks.includes(m.rank)
    )
    logger.info(
        "Blizzard",
        `Filtered to ${s(allowedMembers.length)} members with allowed ranks`
    )

    // Get existing characters to check for duplicates
    const existingCharacters = await characterRepo.getList()
    const existingSet = new Set(
        existingCharacters.map((c) => `${c.name.toLowerCase()}-${c.realm.toLowerCase()}`)
    )

    const errors: string[] = []
    let imported = 0
    let skipped = 0

    for (const member of allowedMembers) {
        const charName = member.character.name
        const charRealm = realmSlugToName(member.character.realm.slug)
        const key = `${charName.toLowerCase()}-${charRealm.toLowerCase()}`

        // Skip if already exists
        if (existingSet.has(key)) {
            skipped++
            continue
        }

        // Map Blizzard class ID to our class name
        const className = mapBlizzardClass(member.character.playable_class.id)
        if (!className) {
            errors.push(
                `Unknown class ID ${s(member.character.playable_class.id)} for ${charName}`
            )
            continue
        }

        try {
            // Check if player with this name already exists
            const existingPlayer = await playerRepo.getByName(charName)
            const playerId = existingPlayer
                ? existingPlayer.id
                : await playerRepo.add({ name: charName })

            // Set as main if new player or if existing player has no main
            const shouldBeMain =
                !existingPlayer || !(await characterRepo.hasMain(playerId))

            // Create character linked to player
            await characterRepo.add({
                name: charName,
                realm: charRealm,
                class: className,
                role: "DPS", // Default to DPS, can be changed later
                main: shouldBeMain,
                playerId,
            })

            imported++
            existingSet.add(key) // Prevent duplicates within same import
        } catch (err) {
            errors.push(`Failed to import ${charName}: ${s(err)}`)
        }
    }

    logger.info(
        "Blizzard",
        `Guild import completed: ${s(imported)} imported, ${s(skipped)} skipped, ${s(errors.length)} errors`
    )

    return { imported, skipped, errors }
}

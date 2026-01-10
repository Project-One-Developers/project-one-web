"use server"

import { keyBy, partition } from "es-toolkit"
import { blizzardRepo } from "@/db/repositories/blizzard"
import { bossRepo } from "@/db/repositories/bosses"
import { characterRepo } from "@/db/repositories/characters"
import { playerRepo } from "@/db/repositories/player.repo"
import { officerAction, safeAction } from "@/lib/errors/action-wrapper"
import { logger } from "@/lib/logger"
import {
    fetchGuildRoster,
    type CharacterProfileResponse,
} from "@/lib/server/blizzard-api"
import {
    fetchAndParseCharacter,
    resetFetchedInstancesCache,
    resetItemsCache,
    type ParsedBlizzardData,
} from "@/lib/server/blizzard-sync"
import { mapBlizzardClassId } from "@/shared/libs/blizzard-mappings"
import {
    formatUnixTimestampToItalianDate,
    getUnixTimestamp,
} from "@/shared/libs/date-utils"
import { s } from "@/shared/libs/string-utils"
import type { Boss } from "@/shared/models/boss.models"
import type {
    BossProgress,
    DefeatedCharacter,
    ProgressionCharacter,
    RosterProgressionByDifficulty,
} from "@/shared/models/character.models"
import type { WowRaidDifficulty } from "@/shared/models/wow.models"
import type { Result } from "@/shared/types"
import { realmSlugToName } from "@/shared/wow.consts"

// Guild Import Config (hardcoded for now)
const GUILD_CONFIG = {
    name: "Project One",
    realm: "pozzo-delleternità", // Use slug directly for API
    realmDisplay: "Pozzo dell'Eternità", // For display/DB storage
    // Rank indices to import (0=GM, 1=Officer, 3=Raider, 5=Trial)
    importRanks: [0, 1, 3, 5],
}

// ============== INTERNAL FUNCTIONS (shared with other actions) ==============

/**
 * Sync all characters' Blizzard API data
 * Fetches profile, equipment, and raid progress for all roster characters
 */
async function syncAllCharactersInternal(): Promise<{
    synced: number
    errors: string[]
}> {
    logger.info("Action", "Start Full Blizzard Sync")
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
                    character.id,
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
                logger.error("Action", error)
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
        "Action",
        `Full Blizzard Sync Completed: ${s(results.length)} synced, ${s(errors.length)} errors`
    )

    return { synced: results.length, errors }
}

/**
 * Sync a single character's Blizzard API data.
 * Exported for use by character actions.
 * Optionally accepts a pre-fetched profile to avoid duplicate API calls.
 */
export async function syncCharacterInternal(
    characterId: string,
    characterName: string,
    characterRealm: string,
    preloadedProfile?: CharacterProfileResponse
): Promise<void> {
    logger.info(
        "Action",
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
        bossLookup,
        preloadedProfile
    )

    if (!result) {
        throw new Error(`Failed to fetch data for ${characterName}-${characterRealm}`)
    }

    await blizzardRepo.upsert([result.character])
    await blizzardRepo.upsertEncounters(characterId, result.encounters)

    logger.info(
        "Action",
        `Single Character Sync Completed: ${characterName} - ${characterRealm}`
    )
}

/**
 * Check if Blizzard data needs updating (based on last sync time)
 * Returns true if sync was performed, false if skipped
 */
async function checkAndSyncInternal(): Promise<{
    synced: boolean
    message: string
    result?: { synced: number; errors: string[] }
}> {
    logger.info("Action", "checkAndSync: checking..")
    const lastSync = await blizzardRepo.getLastTimeSynced()
    const frequencyTS = 1 * 60 * 60 // 1 hour in seconds

    if (lastSync === null || getUnixTimestamp() - lastSync > frequencyTS) {
        logger.info(
            "Action",
            `checkAndSync: Blizzard data needs to be updated (${
                lastSync !== null ? formatUnixTimestampToItalianDate(lastSync) : "never"
            }) - syncing now`
        )
        const result = await syncAllCharactersInternal()
        return {
            synced: true,
            message: `Synced ${s(result.synced)} characters`,
            result,
        }
    } else {
        const message = `Blizzard data is up to date (last sync: ${formatUnixTimestampToItalianDate(lastSync)})`
        logger.info("Action", `checkAndSync: ${message}`)
        return { synced: false, message }
    }
}

/**
 * Get roster progression data with encounters from normalized table.
 */
async function getRosterProgressionInternal(
    raidSlug: string
): Promise<RosterProgressionByDifficulty> {
    const roster = await characterRepo.getList(true, true)
    logger.info(
        "Action",
        `Fetching roster progression for ${s(roster.length)} characters (raid: ${raidSlug})`
    )

    const emptyResult: RosterProgressionByDifficulty = {
        Mythic: {},
        Heroic: {},
        Normal: {},
    }

    if (roster.length === 0) {
        return emptyResult
    }

    // Get bosses for this raid
    const bosses = await bossRepo.getByRaidSlug(raidSlug)
    const bossesWithEncounterId = bosses.filter(
        (b): b is Boss & { blizzardEncounterId: number } => b.blizzardEncounterId !== null
    )

    if (bossesWithEncounterId.length === 0) {
        return emptyResult
    }

    // Get encounters for all roster characters
    const characterIds = roster.map((c) => c.id)
    const allEncounters = await blizzardRepo.getEncountersForRoster(
        characterIds,
        raidSlug
    )

    // Build lookup keyed by "characterId-difficulty-encounterId"
    const encounterByKey = new Map(
        allEncounters.map((enc) => [
            `${enc.characterId}-${enc.difficulty}-${s(enc.encounter.encounterId)}`,
            enc,
        ])
    )

    // Build progression character data (minimal fields)
    const rosterChars: ProgressionCharacter[] = roster.map((c) => ({
        id: c.id,
        name: c.name,
        class: c.class,
        role: c.role,
        main: c.main,
    }))

    type SupportedDifficulty = Exclude<WowRaidDifficulty, "LFR">

    // Build boss progress for a single difficulty+boss combination
    const buildBossProgress = (
        difficulty: SupportedDifficulty,
        bossEncounterId: number
    ): BossProgress => {
        const defeated: DefeatedCharacter[] = []
        const notDefeated: ProgressionCharacter[] = []

        for (const char of rosterChars) {
            const key = `${char.id}-${difficulty}-${s(bossEncounterId)}`
            const encounter = encounterByKey.get(key)?.encounter
            if (encounter) {
                defeated.push({
                    ...char,
                    numKills: encounter.numKills,
                    lastDefeated: encounter.lastDefeated,
                })
            } else {
                notDefeated.push(char)
            }
        }

        const defeatedByRole = Object.groupBy(defeated, (c) => c.role)

        return {
            defeated: {
                Tank: defeatedByRole.Tank ?? [],
                Healer: defeatedByRole.Healer ?? [],
                DPS: defeatedByRole.DPS ?? [],
            },
            notDefeated,
        }
    }

    const buildDifficultyData = (difficulty: SupportedDifficulty) =>
        Object.fromEntries(
            bossesWithEncounterId.map((boss) => [
                boss.id,
                buildBossProgress(difficulty, boss.blizzardEncounterId),
            ])
        )

    return {
        Mythic: buildDifficultyData("Mythic"),
        Heroic: buildDifficultyData("Heroic"),
        Normal: buildDifficultyData("Normal"),
    }
}

/**
 * Import guild members from Blizzard API.
 */
async function importGuildMembersInternal(): Promise<{
    imported: number
    skipped: number
    errors: string[]
}> {
    logger.info(
        "Action",
        `Importing guild members from ${GUILD_CONFIG.name}-${GUILD_CONFIG.realm}`
    )

    const roster = await fetchGuildRoster(GUILD_CONFIG.name, GUILD_CONFIG.realm)
    if (!roster) {
        throw new Error("Failed to fetch guild roster from Blizzard API")
    }

    logger.info("Action", `Found ${s(roster.members.length)} total guild members`)

    // Filter by allowed ranks
    const allowedMembers = roster.members.filter((m) =>
        GUILD_CONFIG.importRanks.includes(m.rank)
    )
    logger.info(
        "Action",
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
        const className = mapBlizzardClassId(member.character.playable_class.id)
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
        "Action",
        `Guild import completed: ${s(imported)} imported, ${s(skipped)} skipped, ${s(errors.length)} errors`
    )

    return { imported, skipped, errors }
}

// ============== EXPORTED ACTIONS ==============

export const syncAllCharactersBlizzard = officerAction(
    async (): Promise<{ synced: number; errors: string[] }> => {
        return syncAllCharactersInternal()
    }
)

export const syncCharacterBlizzard = officerAction(
    async (
        characterId: string,
        characterName: string,
        characterRealm: string,
        preloadedProfile?: CharacterProfileResponse
    ): Promise<void> => {
        return syncCharacterInternal(
            characterId,
            characterName,
            characterRealm,
            preloadedProfile
        )
    }
)

export const checkBlizzardUpdates = officerAction(
    async (): Promise<{
        synced: boolean
        message: string
        result?: { synced: number; errors: string[] }
    }> => {
        return checkAndSyncInternal()
    }
)

export const getRosterProgression = safeAction(
    async (raidSlug: string): Promise<RosterProgressionByDifficulty> => {
        return getRosterProgressionInternal(raidSlug)
    }
)

export const importGuildMembers = officerAction(
    async (): Promise<{ imported: number; skipped: number; errors: string[] }> => {
        return importGuildMembersInternal()
    }
)

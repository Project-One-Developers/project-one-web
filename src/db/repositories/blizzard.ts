import { and, desc, eq, inArray } from "drizzle-orm"
import { chunk, uniqBy } from "es-toolkit"
import "server-only"
import { db } from "@/db"
import {
    bossTable,
    characterEncounterTable,
    charBlizzardTable,
    charTable,
} from "@/db/schema"
import { conflictUpdateAllExcept, identity, mapAndParse } from "@/db/utils"
import { logger } from "@/lib/logger"
import { defined } from "@/lib/utils"
import { s } from "@/shared/libs/string-utils"
import {
    charBlizzardSchema,
    type BlizzardEncounter,
    type CharacterBlizzard,
} from "@/shared/models/blizzard.models"

// Type for inserting encounters (inferred from schema, id is optional)
type CharacterEncounterInsert = Omit<typeof characterEncounterTable.$inferInsert, "id">
export type CharacterBlizzardInsert = typeof charBlizzardTable.$inferInsert

// Base query for character blizzard data with joined character info
const getCharBlizzardQuery = () =>
    db
        .select({
            characterId: charBlizzardTable.characterId,
            name: charTable.name,
            realm: charTable.realm,
            race: charBlizzardTable.race,
            blizzardCharacterId: charBlizzardTable.blizzardCharacterId,
            syncedAt: charBlizzardTable.syncedAt,
            lastLoginAt: charBlizzardTable.lastLoginAt,
            averageItemLevel: charBlizzardTable.averageItemLevel,
            equippedItemLevel: charBlizzardTable.equippedItemLevel,
            itemsEquipped: charBlizzardTable.itemsEquipped,
            mountIds: charBlizzardTable.mountIds,
        })
        .from(charBlizzardTable)
        .innerJoin(charTable, eq(charBlizzardTable.characterId, charTable.id))

export const blizzardRepo = {
    upsert: async (characters: CharacterBlizzardInsert[]): Promise<void> => {
        logger.info("Blizzard", `upsert: received ${s(characters.length)} characters`)
        if (characters.length === 0) {
            return
        }
        try {
            await db
                .insert(charBlizzardTable)
                .values(characters)
                .onConflictDoUpdate({
                    target: charBlizzardTable.characterId,
                    set: conflictUpdateAllExcept(charBlizzardTable, ["characterId"]),
                })
            logger.info("Blizzard", `upsert: inserted ${s(characters.length)} characters`)
        } catch (error) {
            logger.error("Blizzard", `upsert failed: ${s(error)}`)
            throw error
        }
    },

    // Upsert encounters for a character (delete old + insert new)
    upsertEncounters: async (
        characterId: string,
        encounters: CharacterEncounterInsert[]
    ): Promise<void> => {
        await db.transaction(async (tx) => {
            // Delete existing encounters for this character
            await tx
                .delete(characterEncounterTable)
                .where(eq(characterEncounterTable.characterId, characterId))

            // Deduplicate encounters (by character-boss-difficulty)
            const uniqueEncounters = uniqBy(
                encounters,
                (e) => `${e.characterId}-${s(e.bossId)}-${e.difficulty}`
            )

            // Insert new encounters
            if (uniqueEncounters.length > 0) {
                await tx.insert(characterEncounterTable).values(uniqueEncounters)
            }
        })
    },

    // Bulk upsert encounters for multiple characters
    upsertAllEncounters: async (
        encountersByCharacter: Record<string, CharacterEncounterInsert[]>
    ): Promise<void> => {
        const characterIds = Object.keys(encountersByCharacter)
        if (characterIds.length === 0) {
            return
        }

        await db.transaction(async (tx) => {
            // Delete all existing encounters for these characters
            await tx
                .delete(characterEncounterTable)
                .where(inArray(characterEncounterTable.characterId, characterIds))

            // Flatten and deduplicate encounters (by character-boss-difficulty)
            const allEncounters = Object.values(encountersByCharacter).flat()
            const uniqueEncounters = uniqBy(
                allEncounters,
                (e) => `${e.characterId}-${s(e.bossId)}-${e.difficulty}`
            )

            // Batch inserts to avoid PostgreSQL parameter limit (~32767 params)
            // 7 columns per row = ~4000 rows max, use 500 for safety
            const batches = chunk(uniqueEncounters, 500)
            for (const batch of batches) {
                await tx.insert(characterEncounterTable).values(batch)
            }
        })
    },

    /**
     * Get encounters for roster characters filtered by raid.
     * Returns domain model encounters with character/difficulty association.
     */
    getEncountersForRoster: async (
        characterIds: string[],
        raidSlug: string
    ): Promise<
        { characterId: string; difficulty: string; encounter: BlizzardEncounter }[]
    > => {
        if (characterIds.length === 0) {
            return []
        }

        const results = await db
            .select({
                characterId: characterEncounterTable.characterId,
                difficulty: characterEncounterTable.difficulty,
                numKills: characterEncounterTable.numKills,
                lastDefeated: characterEncounterTable.lastDefeated,
                blizzardEncounterId: bossTable.blizzardEncounterId,
            })
            .from(characterEncounterTable)
            .innerJoin(bossTable, eq(characterEncounterTable.bossId, bossTable.id))
            .where(
                and(
                    inArray(characterEncounterTable.characterId, characterIds),
                    eq(bossTable.raidSlug, raidSlug)
                )
            )

        // Convert to domain model, filtering out encounters without blizzardEncounterId
        return results
            .filter((row): row is typeof row & { blizzardEncounterId: number } =>
                defined(row.blizzardEncounterId)
            )
            .map((row) => ({
                characterId: row.characterId,
                difficulty: row.difficulty,
                encounter: {
                    encounterId: row.blizzardEncounterId,
                    numKills: row.numKills,
                    lastDefeated: row.lastDefeated?.toISOString() ?? null,
                },
            }))
    },

    getLastTimeSynced: async (): Promise<number | null> => {
        const result = await db
            .select({ syncedAt: charBlizzardTable.syncedAt })
            .from(charBlizzardTable)
            .orderBy(desc(charBlizzardTable.syncedAt))
            .limit(1)
            .then((r) => r.at(0))
        return result?.syncedAt ?? null
    },

    getByChar: async (
        charName: string,
        charRealm: string
    ): Promise<CharacterBlizzard | null> => {
        const result = await getCharBlizzardQuery()
            .where(and(eq(charTable.name, charName), eq(charTable.realm, charRealm)))
            .then((r) => r.at(0))
        if (!result) {
            return null
        }
        return mapAndParse(result, identity, charBlizzardSchema)
    },

    getByCharId: async (characterId: string): Promise<CharacterBlizzard | null> => {
        const result = await getCharBlizzardQuery()
            .where(eq(charBlizzardTable.characterId, characterId))
            .then((r) => r.at(0))
        if (!result) {
            return null
        }
        return mapAndParse(result, identity, charBlizzardSchema)
    },

    /**
     * Get blizzard data for multiple characters.
     * Returns a Map keyed by characterId for efficient lookups.
     */
    getByCharIds: async (
        characterIds: string[]
    ): Promise<Map<string, CharacterBlizzard>> => {
        if (characterIds.length === 0) {
            return new Map()
        }

        const results = await getCharBlizzardQuery().where(
            inArray(charBlizzardTable.characterId, characterIds)
        )

        const mapped = mapAndParse(results, identity, charBlizzardSchema)
        return new Map(
            mapped.flatMap((blizzard, i) => {
                const row = results[i]
                return row ? [[row.characterId, blizzard] as const] : []
            })
        )
    },
}

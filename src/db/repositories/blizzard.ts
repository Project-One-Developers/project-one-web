import { and, desc, eq, inArray } from "drizzle-orm"
import { chunk, uniqBy } from "es-toolkit"
import { z } from "zod"
import { db } from "@/db"
import {
    bossTable,
    characterEncounterTable,
    charBlizzardTable,
    charTable,
} from "@/db/schema"
import { conflictUpdateAllExcept, identity, mapAndParse } from "@/db/utils"
import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"
import type { WowRaidDifficulty } from "@/shared/models/wow.model"

// Type for inserting encounters
export type CharacterEncounterInsert = {
    characterId: string
    bossId: number
    difficulty: WowRaidDifficulty
    itemLevel: number
    numKills: number
    firstDefeated: Date | null
    lastDefeated: Date | null
}

// Type for encounter with boss info (for queries)
export type CharacterEncounterWithBoss = {
    id: number
    characterId: string
    bossId: number
    difficulty: WowRaidDifficulty
    itemLevel: number
    numKills: number
    firstDefeated: Date | null
    lastDefeated: Date | null
    boss: {
        blizzardEncounterId: number | null
        raidSlug: string | null
        encounterSlug: string | null
    }
}

// Infer insert type from schema
export type CharacterBlizzardInsert = typeof charBlizzardTable.$inferInsert

// Schema for blizzard character data (with name/realm from join)
const charBlizzardDbSchema = z.object({
    characterId: z.string(),
    name: z.string(),
    realm: z.string(),
    race: z.string().nullable(),
    blizzardCharacterId: z.number(),
    syncedAt: z.number(),
    lastLoginAt: z.number(),
    averageItemLevel: z.number().nullable(),
    equippedItemLevel: z.number().nullable(),
    itemsEquipped: z.array(z.any()),
})

export type CharacterBlizzardDb = z.infer<typeof charBlizzardDbSchema>

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

    // Get encounters for a roster filtered by raid
    getEncountersForRoster: async (
        characterIds: string[],
        raidSlug: string
    ): Promise<CharacterEncounterWithBoss[]> => {
        if (characterIds.length === 0) {
            return []
        }

        const result = await db
            .select({
                id: characterEncounterTable.id,
                characterId: characterEncounterTable.characterId,
                bossId: characterEncounterTable.bossId,
                difficulty: characterEncounterTable.difficulty,
                itemLevel: characterEncounterTable.itemLevel,
                numKills: characterEncounterTable.numKills,
                firstDefeated: characterEncounterTable.firstDefeated,
                lastDefeated: characterEncounterTable.lastDefeated,
                boss: {
                    blizzardEncounterId: bossTable.blizzardEncounterId,
                    raidSlug: bossTable.raidSlug,
                    encounterSlug: bossTable.encounterSlug,
                },
            })
            .from(characterEncounterTable)
            .innerJoin(bossTable, eq(characterEncounterTable.bossId, bossTable.id))
            .where(
                and(
                    inArray(characterEncounterTable.characterId, characterIds),
                    eq(bossTable.raidSlug, raidSlug)
                )
            )

        return result as CharacterEncounterWithBoss[]
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
    ): Promise<CharacterBlizzardDb | null> => {
        const result = await db
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
            })
            .from(charBlizzardTable)
            .innerJoin(charTable, eq(charBlizzardTable.characterId, charTable.id))
            .where(and(eq(charTable.name, charName), eq(charTable.realm, charRealm)))
            .then((r) => r.at(0))
        return result ? mapAndParse(result, identity, charBlizzardDbSchema) : null
    },

    getByCharId: async (characterId: string): Promise<CharacterBlizzardDb | null> => {
        const result = await db
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
            })
            .from(charBlizzardTable)
            .innerJoin(charTable, eq(charBlizzardTable.characterId, charTable.id))
            .where(eq(charBlizzardTable.characterId, characterId))
            .then((r) => r.at(0))
        return result ? mapAndParse(result, identity, charBlizzardDbSchema) : null
    },

    getAll: async (): Promise<CharacterBlizzardDb[]> => {
        const result = await db
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
            })
            .from(charBlizzardTable)
            .innerJoin(charTable, eq(charBlizzardTable.characterId, charTable.id))
        return mapAndParse(result, identity, charBlizzardDbSchema)
    },

    getByCharIds: async (characterIds: string[]): Promise<CharacterBlizzardDb[]> => {
        if (characterIds.length === 0) {
            return []
        }

        const result = await db
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
            })
            .from(charBlizzardTable)
            .innerJoin(charTable, eq(charBlizzardTable.characterId, charTable.id))
            .where(inArray(charBlizzardTable.characterId, characterIds))
        return mapAndParse(result, identity, charBlizzardDbSchema)
    },
}

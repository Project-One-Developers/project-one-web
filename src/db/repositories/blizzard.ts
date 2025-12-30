import { and, desc, eq, inArray, or } from "drizzle-orm"
import { chunk, uniqBy } from "es-toolkit"
import { z } from "zod"
import { db } from "@/db"
import { bossTable, characterEncounterTable, charBlizzardTable } from "@/db/schema"
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

// Schema for blizzard character data
const charBlizzardDbSchema = z.object({
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
    upsert: async (characters: CharacterBlizzardDb[]): Promise<void> => {
        logger.info("Blizzard", `upsert: received ${s(characters.length)} characters`)
        if (characters.length === 0) {
            return
        }
        try {
            await db
                .insert(charBlizzardTable)
                .values(characters)
                .onConflictDoUpdate({
                    target: [charBlizzardTable.name, charBlizzardTable.realm],
                    set: conflictUpdateAllExcept(charBlizzardTable, ["name", "realm"]),
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

            // Insert new encounters
            if (encounters.length > 0) {
                await tx.insert(characterEncounterTable).values(encounters)
            }
        })
    },

    // Bulk upsert encounters for multiple characters
    upsertAllEncounters: async (
        encountersByCharacter: Map<string, CharacterEncounterInsert[]>
    ): Promise<void> => {
        if (encountersByCharacter.size === 0) {
            return
        }

        await db.transaction(async (tx) => {
            const characterIds = Array.from(encountersByCharacter.keys())

            // Delete all existing encounters for these characters
            await tx
                .delete(characterEncounterTable)
                .where(inArray(characterEncounterTable.characterId, characterIds))

            // Flatten and deduplicate encounters (by character-boss-difficulty)
            const allEncounters = Array.from(encountersByCharacter.values()).flat()
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
            .select()
            .from(charBlizzardTable)
            .orderBy(desc(charBlizzardTable.syncedAt))
            .limit(1)
            .then((r) => r.at(0))
        return result ? result.syncedAt : null
    },

    getByChar: async (
        charName: string,
        charRealm: string
    ): Promise<CharacterBlizzardDb | null> => {
        const result = await db
            .select()
            .from(charBlizzardTable)
            .where(
                and(
                    eq(charBlizzardTable.name, charName),
                    eq(charBlizzardTable.realm, charRealm)
                )
            )
            .then((r) => r.at(0))
        return result ? mapAndParse(result, identity, charBlizzardDbSchema) : null
    },

    getAll: async (): Promise<CharacterBlizzardDb[]> => {
        const result = await db.select().from(charBlizzardTable)
        return mapAndParse(result, identity, charBlizzardDbSchema)
    },

    getByChars: async (
        chars: { name: string; realm: string }[]
    ): Promise<CharacterBlizzardDb[]> => {
        if (chars.length === 0) {
            return []
        }

        const result = await db
            .select()
            .from(charBlizzardTable)
            .where(
                or(
                    ...chars.map((c) =>
                        and(
                            eq(charBlizzardTable.name, c.name),
                            eq(charBlizzardTable.realm, c.realm)
                        )
                    )
                )
            )
        return mapAndParse(result, identity, charBlizzardDbSchema)
    },
}

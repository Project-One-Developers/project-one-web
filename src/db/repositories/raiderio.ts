import { and, desc, eq, inArray, or } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { bossTable, characterEncounterTable, charRaiderioTable } from "@/db/schema"
import { conflictUpdateAllExcept } from "@/db/utils"
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
        raiderioEncounterSlug: string | null
        raiderioRaidSlug: string | null
    }
}

// Schema for raiderio character data (without progress JSONB)
const charRaiderioDbSchema = z.object({
    name: z.string(),
    realm: z.string(),
    race: z.string().nullable(),
    characterId: z.number(),
    p1SyncAt: z.number(),
    loggedOutAt: z.number(),
    itemUpdateAt: z.number(),
    averageItemLevel: z.string().nullable(),
    itemsEquipped: z.array(z.any()),
})

export type CharacterRaiderioDb = z.infer<typeof charRaiderioDbSchema>

export const raiderioRepo = {
    upsert: async (characters: CharacterRaiderioDb[]): Promise<void> => {
        if (characters.length === 0) {
            return
        }
        await db
            .insert(charRaiderioTable)
            .values(characters)
            .onConflictDoUpdate({
                target: [charRaiderioTable.name, charRaiderioTable.realm],
                set: conflictUpdateAllExcept(charRaiderioTable, ["name", "realm"]),
            })
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

            // Flatten and insert all encounters
            const allEncounters = Array.from(encountersByCharacter.values()).flat()
            if (allEncounters.length > 0) {
                await tx.insert(characterEncounterTable).values(allEncounters)
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
                    raiderioEncounterSlug: bossTable.raiderioEncounterSlug,
                    raiderioRaidSlug: bossTable.raiderioRaidSlug,
                },
            })
            .from(characterEncounterTable)
            .innerJoin(bossTable, eq(characterEncounterTable.bossId, bossTable.id))
            .where(
                and(
                    inArray(characterEncounterTable.characterId, characterIds),
                    eq(bossTable.raiderioRaidSlug, raidSlug)
                )
            )

        return result as CharacterEncounterWithBoss[]
    },

    getLastTimeSynced: async (): Promise<number | null> => {
        const result = await db
            .select()
            .from(charRaiderioTable)
            .orderBy(desc(charRaiderioTable.p1SyncAt))
            .limit(1)
            .then((r) => r.at(0))
        return result ? result.p1SyncAt : null
    },

    getByChar: async (
        charName: string,
        charRealm: string
    ): Promise<CharacterRaiderioDb | null> => {
        const result = await db
            .select()
            .from(charRaiderioTable)
            .where(
                and(
                    eq(charRaiderioTable.name, charName),
                    eq(charRaiderioTable.realm, charRealm)
                )
            )
            .then((r) => r.at(0))
        return result ? charRaiderioDbSchema.parse(result) : null
    },

    getAll: async (): Promise<CharacterRaiderioDb[]> => {
        const result = await db.select().from(charRaiderioTable)
        return z.array(charRaiderioDbSchema).parse(result)
    },

    getByChars: async (
        chars: { name: string; realm: string }[]
    ): Promise<CharacterRaiderioDb[]> => {
        if (chars.length === 0) {
            return []
        }

        const result = await db
            .select()
            .from(charRaiderioTable)
            .where(
                or(
                    ...chars.map((c) =>
                        and(
                            eq(charRaiderioTable.name, c.name),
                            eq(charRaiderioTable.realm, c.realm)
                        )
                    )
                )
            )
        return z.array(charRaiderioDbSchema).parse(result)
    },
}

import { eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { simcTable } from "@/db/schema"
import { conflictUpdateAllExcept, mapAndParse, newUUID } from "@/db/utils"
import { simcSchema, type SimC } from "@/shared/models/simulation.model"

/** Input type for adding SimC data (before we have id/characterId) */
export type NewSimC = Omit<SimC, "id" | "characterId">

// Mapper to handle nullable JSONB columns from DB -> non-nullable arrays in schema
const mapSimcRow = (row: typeof simcTable.$inferSelect): SimC => ({
    ...row,
    weeklyChest: row.weeklyChest ?? [],
    currencies: row.currencies ?? [],
    itemsInBag: row.itemsInBag ?? [],
    tiersetInfo: row.tiersetInfo ?? [],
})

export const simcRepo = {
    getAll: async (): Promise<SimC[]> => {
        const result = await db.select().from(simcTable)
        return mapAndParse(result, mapSimcRow, simcSchema)
    },

    getByCharacterId: async (characterId: string): Promise<SimC | null> => {
        const result = await db
            .select()
            .from(simcTable)
            .where(eq(simcTable.characterId, characterId))
            .then((r) => r.at(0))
        return result ? mapAndParse(result, mapSimcRow, simcSchema) : null
    },

    getByCharacterIds: async (characterIds: string[]): Promise<SimC[]> => {
        if (characterIds.length === 0) {
            return []
        }
        const result = await db
            .select()
            .from(simcTable)
            .where(inArray(simcTable.characterId, characterIds))
        return mapAndParse(result, mapSimcRow, simcSchema)
    },

    add: async (simc: NewSimC, characterId: string): Promise<SimC> => {
        const id = newUUID()
        await db
            .insert(simcTable)
            .values({ ...simc, id, characterId })
            .onConflictDoUpdate({
                target: [simcTable.characterId],
                set: conflictUpdateAllExcept(simcTable, ["id", "characterId"]),
            })
        const result = await simcRepo.getByCharacterId(characterId)
        if (!result) {
            throw new Error(
                `Failed to get SimC after insert for characterId: ${characterId}`
            )
        }
        return result
    },
}

import { and, eq, or } from "drizzle-orm"
import { db } from "@/db"
import { simcTable } from "@/db/schema"
import { conflictUpdateAllExcept, mapAndParse } from "@/db/utils"
import { simcSchema, type SimC } from "@/shared/models/simulation.model"

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

    getByChar: async (charName: string, charRealm: string): Promise<SimC | null> => {
        const result = await db
            .select()
            .from(simcTable)
            .where(
                and(eq(simcTable.charName, charName), eq(simcTable.charRealm, charRealm))
            )
            .then((r) => r.at(0))
        return result ? mapAndParse(result, mapSimcRow, simcSchema) : null
    },

    add: async (simc: SimC): Promise<void> => {
        await db
            .insert(simcTable)
            .values(simc)
            .onConflictDoUpdate({
                target: [simcTable.charName, simcTable.charRealm],
                set: conflictUpdateAllExcept(simcTable, ["charName", "charRealm"]),
            })
    },

    getByChars: async (chars: { name: string; realm: string }[]): Promise<SimC[]> => {
        if (chars.length === 0) {
            return []
        }

        const result = await db
            .select()
            .from(simcTable)
            .where(
                or(
                    ...chars.map((c) =>
                        and(
                            eq(simcTable.charName, c.name),
                            eq(simcTable.charRealm, c.realm)
                        )
                    )
                )
            )
        return mapAndParse(result, mapSimcRow, simcSchema)
    },
}

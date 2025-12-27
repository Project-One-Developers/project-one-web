import { eq, sql } from "drizzle-orm"

import { db } from "@/db"
import { bisListTable } from "@/db/schema"
import { newUUID } from "@/db/utils"
import type { BisList } from "@/shared/types/types"

export const bisListRepo = {
    getAll: async (): Promise<BisList[]> => {
        const results = await db
            .select({
                itemId: bisListTable.itemId,
                specIds: sql<number[]>`array_agg(${bisListTable.specId})`,
            })
            .from(bisListTable)
            .groupBy(bisListTable.itemId)

        return results
    },

    updateItemBisSpec: async (itemId: number, specIds: number[]): Promise<void> => {
        await db.delete(bisListTable).where(eq(bisListTable.itemId, itemId))

        if (specIds.length > 0) {
            const values = specIds.map((spec) => ({
                id: newUUID(),
                specId: spec,
                itemId: itemId,
            }))

            await db.insert(bisListTable).values(values)
        }
    },
}

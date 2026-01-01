import { eq, sql } from "drizzle-orm"
import { unstable_cache, updateTag } from "next/cache"
import "server-only"
import { db } from "@/db"
import { bisListTable } from "@/db/schema"
import { newUUID } from "@/db/utils"
import type { BisList } from "@/shared/models/bis-list.model"

const CACHE_TAG = "bis-list"

export const bisListRepo = {
    getAll: unstable_cache(
        async (): Promise<BisList[]> => {
            return await db
                .select({
                    itemId: bisListTable.itemId,
                    specIds: sql<number[]>`array_agg(${bisListTable.specId})`,
                })
                .from(bisListTable)
                .groupBy(bisListTable.itemId)
        },
        [CACHE_TAG],
        { tags: [CACHE_TAG], revalidate: 300 }
    ),

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

        updateTag(CACHE_TAG)
    },
}

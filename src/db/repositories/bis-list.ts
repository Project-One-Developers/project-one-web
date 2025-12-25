import { db } from "@/db"
import { bisListTable } from "@/db/schema"
import { newUUID } from "@/db/utils"
import type { BisList } from "@/shared/types/types"
import { eq, sql } from "drizzle-orm"

export async function getBisList(): Promise<BisList[]> {
    const results = await db
        .select({
            itemId: bisListTable.itemId,
            specIds: sql<number[]>`array_agg(${bisListTable.specId})`,
        })
        .from(bisListTable)
        .groupBy(bisListTable.itemId)

    return results
}

export async function updateItemBisSpec(
    itemId: number,
    specIds: number[]
): Promise<void> {
    await db.delete(bisListTable).where(eq(bisListTable.itemId, itemId))

    if (specIds.length > 0) {
        const values = specIds.map((spec) => ({
            id: newUUID(),
            specId: spec,
            itemId: itemId,
        }))

        await db.insert(bisListTable).values(values)
    }
}

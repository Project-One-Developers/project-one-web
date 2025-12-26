import { z } from "zod"

import { db } from "@/db"
import { bossTable } from "@/db/schema"
import { buildConflictUpdateColumns } from "@/db/utils"
import { bossSchema, bossWithItemsSchema } from "@/shared/schemas/boss.schema"
import type { Boss, BossWithItems } from "@/shared/types/types"

export async function upsertBosses(bosses: Boss[]): Promise<void> {
    if (bosses.length === 0) {
        return
    }

    // Batch upsert - single query instead of N queries
    await db
        .insert(bossTable)
        .values(bosses)
        .onConflictDoUpdate({
            target: bossTable.id,
            set: buildConflictUpdateColumns(bossTable, [
                "name",
                "instanceId",
                "instanceName",
                "instanceType",
                "order",
                "raiderioEncounterSlug",
                "raiderioRaidSlug",
            ]),
        })
}

export async function getRaidLootTable(raidId: number): Promise<BossWithItems[]> {
    const result = await db.query.bossTable.findMany({
        where: (bossTable, { eq }) => eq(bossTable.instanceId, raidId),
        with: { items: true },
    })
    return z.array(bossWithItemsSchema).parse(result)
}

export async function getBosses(raidId: number): Promise<Boss[]> {
    const result = await db.query.bossTable.findMany({
        where: (bossTable, { eq }) => eq(bossTable.instanceId, raidId),
    })
    return z.array(bossSchema).parse(result)
}

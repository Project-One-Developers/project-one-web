import { z } from "zod"
import { db } from "@/db"
import { bossTable } from "@/db/schema"
import { buildConflictUpdateColumns } from "@/db/utils"
import {
    bossSchema,
    bossWithItemsSchema,
    type Boss,
    type BossWithItems,
} from "@/shared/models/boss.model"

export const bossRepo = {
    upsert: async (bosses: Boss[]): Promise<void> => {
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
    },

    getLootTable: async (raidId: number): Promise<BossWithItems[]> => {
        const result = await db.query.bossTable.findMany({
            where: (bossTable, { eq }) => eq(bossTable.instanceId, raidId),
            with: { items: true },
        })
        return z.array(bossWithItemsSchema).parse(result)
    },

    getAll: async (raidId: number): Promise<Boss[]> => {
        const result = await db.query.bossTable.findMany({
            where: (bossTable, { eq }) => eq(bossTable.instanceId, raidId),
        })
        return z.array(bossSchema).parse(result)
    },
}

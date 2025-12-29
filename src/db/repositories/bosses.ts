import { eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { bossTable, itemTable } from "@/db/schema"
import { buildConflictUpdateColumns, identity, mapAndParse } from "@/db/utils"
import {
    bossSchema,
    bossWithItemsSchema,
    type Boss,
    type BossWithItems,
} from "@/shared/models/boss.model"

export const bossRepo = {
    // Get boss ID by raiderio encounter slug
    getByRaiderioSlug: async (slug: string): Promise<Boss | null> => {
        const result = await db
            .select()
            .from(bossTable)
            .where(eq(bossTable.raiderioEncounterSlug, slug))
            .limit(1)
            .then((r) => r.at(0))

        return result ? mapAndParse(result, identity, bossSchema) : null
    },

    // Get all bosses by raid slug (for bulk lookup)
    getByRaidSlug: async (raidSlug: string): Promise<Boss[]> => {
        const result = await db
            .select()
            .from(bossTable)
            .where(eq(bossTable.raiderioRaidSlug, raidSlug))

        return mapAndParse(result, identity, bossSchema)
    },

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
        // Fetch bosses and items separately, then aggregate
        const bosses = await db
            .select()
            .from(bossTable)
            .where(eq(bossTable.instanceId, raidId))

        if (bosses.length === 0) {
            return []
        }

        const bossIds = bosses.map((b) => b.id)
        const items = await db
            .select()
            .from(itemTable)
            .where(inArray(itemTable.bossId, bossIds))

        const itemsByBoss = Map.groupBy(items, (i) => i.bossId)

        return mapAndParse(
            bosses,
            (boss) => ({ ...boss, items: itemsByBoss.get(boss.id) ?? [] }),
            bossWithItemsSchema
        )
    },

    getAll: async (raidId?: number): Promise<Boss[]> => {
        const result =
            raidId !== undefined
                ? await db
                      .select()
                      .from(bossTable)
                      .where(eq(bossTable.instanceId, raidId))
                : await db.select().from(bossTable)

        return mapAndParse(result, identity, bossSchema)
    },
}

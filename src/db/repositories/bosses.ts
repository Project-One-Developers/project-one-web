import { eq, inArray } from "drizzle-orm"
import "server-only"
import { db } from "@/db"
import { bossTable, itemTable } from "@/db/schema"
import { buildConflictUpdateColumns, identity, mapAndParse } from "@/db/utils"
import {
    bossSchema,
    bossWithItemsSchema,
    type Boss,
    type BossWithItems,
} from "@/shared/models/boss.models"

export const bossRepo = {
    // Get boss by encounter slug
    getByEncounterSlug: async (slug: string): Promise<Boss | null> => {
        const result = await db
            .select()
            .from(bossTable)
            .where(eq(bossTable.encounterSlug, slug))
            .limit(1)
            .then((r) => r.at(0))

        return result ? mapAndParse(result, identity, bossSchema) : null
    },

    // Get all bosses by raid slug (for bulk lookup)
    getByRaidSlug: async (raidSlug: string): Promise<Boss[]> => {
        const result = await db
            .select()
            .from(bossTable)
            .where(eq(bossTable.raidSlug, raidSlug))

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
                    "encounterSlug",
                    "raidSlug",
                    "blizzardEncounterId",
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

    /**
     * Get bosses from multiple raids with recalculated sequential order across all raids.
     * Bosses are sorted by raid order (instanceId), then by their original order within each raid.
     * The order field is recalculated to be sequential across all raids (0, 1, 2, 3...).
     *
     * Example: If raidIds = [1307, 1308, 1314] with 6, 2, and 1 bosses respectively:
     * - Raid 1307 bosses get orders 0-5
     * - Raid 1308 bosses get orders 6-7
     * - Raid 1314 boss gets order 8
     */
    getSeasonalRaidBosses: async (raidIds: number[]): Promise<Boss[]> => {
        if (raidIds.length === 0) {
            return []
        }

        const result = await db
            .select()
            .from(bossTable)
            .where(inArray(bossTable.instanceId, raidIds))

        const bosses = mapAndParse(result, identity, bossSchema)

        // Sort by instanceId (raid order), then by original order within raid
        bosses.sort((a, b) => {
            const raidOrderA = raidIds.indexOf(a.instanceId)
            const raidOrderB = raidIds.indexOf(b.instanceId)

            if (raidOrderA !== raidOrderB) {
                return raidOrderA - raidOrderB
            }

            return a.order - b.order
        })

        // Recalculate order to be sequential across all raids
        return bosses.map((boss, index) => ({
            ...boss,
            order: index,
        }))
    },

    /**
     * Get loot tables (bosses with items) from multiple raids with recalculated sequential order.
     * Similar to getSeasonalRaidBosses but includes items for each boss.
     *
     * Example: If raidIds = [1307, 1308, 1314] with 6, 2, and 1 bosses respectively:
     * - Raid 1307 bosses get orders 0-5
     * - Raid 1308 bosses get orders 6-7
     * - Raid 1314 boss gets order 8
     */
    getSeasonalRaidLootTable: async (raidIds: number[]): Promise<BossWithItems[]> => {
        if (raidIds.length === 0) {
            return []
        }

        // Fetch bosses for all raids
        const bossesResult = await db
            .select()
            .from(bossTable)
            .where(inArray(bossTable.instanceId, raidIds))

        if (bossesResult.length === 0) {
            return []
        }

        const bosses = mapAndParse(bossesResult, identity, bossSchema)

        // Sort by instanceId (raid order), then by original order within raid
        bosses.sort((a, b) => {
            const raidOrderA = raidIds.indexOf(a.instanceId)
            const raidOrderB = raidIds.indexOf(b.instanceId)

            if (raidOrderA !== raidOrderB) {
                return raidOrderA - raidOrderB
            }

            return a.order - b.order
        })

        // Fetch items for all bosses
        const bossIds = bosses.map((b) => b.id)
        const items = await db
            .select()
            .from(itemTable)
            .where(inArray(itemTable.bossId, bossIds))

        const itemsByBoss = Map.groupBy(items, (i) => i.bossId)

        // Recalculate order and attach items
        return mapAndParse(
            bosses.map((boss, index) => ({ ...boss, order: index })),
            (boss) => ({ ...boss, items: itemsByBoss.get(boss.id) ?? [] }),
            bossWithItemsSchema
        )
    },
}

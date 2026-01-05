import { and, eq, ilike, inArray, or } from "drizzle-orm"
import { unstable_cache, updateTag } from "next/cache"
import "server-only"
import { db } from "@/db"
import { itemTable, itemToCatalystTable, itemToTiersetTable } from "@/db/schema"
import { buildConflictUpdateColumns, identity, mapAndParse } from "@/db/utils"
import { CURRENT_SEASON } from "@/shared/libs/season-config"
import {
    itemSchema,
    itemToCatalystSchema,
    itemToTiersetSchema,
    type Item,
    type ItemToCatalyst,
    type ItemToTierset,
} from "@/shared/models/item.models"

const TIERSET_CACHE_TAG = "tierset-mapping"

export const itemRepo = {
    getAll: async (): Promise<Item[]> => {
        const items = await db.select().from(itemTable)
        return mapAndParse(items, identity, itemSchema)
    },

    getById: async (id: number): Promise<Item | null> => {
        const res = await db
            .select()
            .from(itemTable)
            .where(eq(itemTable.id, id))
            .then((r) => r.at(0))
        return res ? mapAndParse(res, identity, itemSchema) : null
    },

    getByIds: async (ids: number[]): Promise<Item[]> => {
        if (ids.length === 0) {
            return []
        }
        const res = await db.select().from(itemTable).where(inArray(itemTable.id, ids))
        return mapAndParse(res, identity, itemSchema)
    },

    getTiersetMapping: unstable_cache(
        async (): Promise<ItemToTierset[]> => {
            const result = await db.select().from(itemToTiersetTable)
            return mapAndParse(result, identity, itemToTiersetSchema)
        },
        [TIERSET_CACHE_TAG],
        { tags: [TIERSET_CACHE_TAG], revalidate: 300 }
    ),

    getCatalystMapping: async (): Promise<ItemToCatalyst[]> => {
        const result = await db.select().from(itemToCatalystTable)
        return mapAndParse(result, identity, itemToCatalystSchema)
    },

    getTiersetAndTokenList: async (): Promise<Item[]> => {
        const res = await db
            .select()
            .from(itemTable)
            .where(
                and(
                    eq(itemTable.season, CURRENT_SEASON),
                    or(eq(itemTable.tierset, true), eq(itemTable.token, true))
                )
            )
        return mapAndParse(res, identity, itemSchema)
    },

    search: async (searchTerm: string, limit: number): Promise<Item[]> => {
        const res = await db
            .select()
            .from(itemTable)
            .where(
                and(
                    eq(itemTable.season, CURRENT_SEASON),
                    eq(itemTable.sourceType, "raid"),
                    ilike(itemTable.name, `%${searchTerm}%`)
                )
            )
            .limit(limit)
        return mapAndParse(res, identity, itemSchema)
    },

    upsert: async (items: Item[]): Promise<void> => {
        if (items.length === 0) {
            return
        }

        // Batch upsert - single query instead of N queries
        await db
            .insert(itemTable)
            .values(items)
            .onConflictDoUpdate({
                target: itemTable.id,
                set: buildConflictUpdateColumns(itemTable, [
                    "name",
                    "ilvlBase",
                    "ilvlMythic",
                    "ilvlHeroic",
                    "ilvlNormal",
                    "slotKey",
                    "armorType",
                    "itemSubclass",
                    "token",
                    "tierset",
                    "veryRare",
                    "specIds",
                    "classes",
                    "iconName",
                    "catalyzed",
                    "sourceId",
                    "sourceName",
                    "sourceType",
                    "bossName",
                    "season",
                    "bossId",
                ]),
            })
    },

    deleteById: async (id: number): Promise<void> => {
        await db.delete(itemTable).where(eq(itemTable.id, id))
    },

    upsertTiersetMapping: async (itemsToTierset: ItemToTierset[]): Promise<void> => {
        if (itemsToTierset.length === 0) {
            return
        }
        await db.delete(itemToTiersetTable)
        await db.insert(itemToTiersetTable).values(itemsToTierset)

        updateTag(TIERSET_CACHE_TAG)
    },

    upsertCatalystMapping: async (itemsToCatalyst: ItemToCatalyst[]): Promise<void> => {
        if (itemsToCatalyst.length === 0) {
            return
        }
        await db.insert(itemToCatalystTable).values(itemsToCatalyst).onConflictDoNothing()
    },

    setNote: async (id: number, note: string): Promise<Item> => {
        const [res] = await db
            .update(itemTable)
            .set({ note })
            .where(eq(itemTable.id, id))
            .returning()

        if (!res) {
            throw new Error(`Failed to update note for item ${String(id)}`)
        }
        return mapAndParse(res, identity, itemSchema)
    },

    deleteNote: async (id: number): Promise<void> => {
        await db.update(itemTable).set({ note: null }).where(eq(itemTable.id, id))
    },
}

import { and, eq, ilike } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import {
    itemNoteTable,
    itemTable,
    itemToCatalystTable,
    itemToTiersetTable,
} from "@/db/schema"
import { buildConflictUpdateColumns } from "@/db/utils"
import { CURRENT_SEASON } from "@/shared/consts/wow.consts"
import { itemNoteSchema } from "@/shared/schemas/itemNote.schema"
import {
    itemSchema,
    itemToCatalystArraySchema,
    itemToTiersetArraySchema,
} from "@/shared/schemas/items.schema"
import type { Item, ItemNote, ItemToCatalyst, ItemToTierset } from "@/shared/types/types"

export const itemRepo = {
    getAll: async (): Promise<Item[]> => {
        const items = await db.query.itemTable.findMany()
        return z.array(itemSchema).parse(items)
    },

    getById: async (id: number): Promise<Item | null> => {
        const res = await db.query.itemTable.findFirst({
            where: (itemTable, { eq }) => eq(itemTable.id, id),
        })
        return res ? itemSchema.parse(res) : null
    },

    getByIds: async (ids: number[]): Promise<Item[]> => {
        const res = await db.query.itemTable.findMany({
            where: (itemTable, { inArray }) => inArray(itemTable.id, ids),
        })
        return z.array(itemSchema).parse(res)
    },

    getTiersetMapping: async (): Promise<ItemToTierset[]> => {
        const result = await db.query.itemToTiersetTable.findMany()
        return itemToTiersetArraySchema.parse(result)
    },

    getCatalystMapping: async (): Promise<ItemToCatalyst[]> => {
        const result = await db.query.itemToCatalystTable.findMany()
        return itemToCatalystArraySchema.parse(result)
    },

    getTiersetAndTokenList: async (): Promise<Item[]> => {
        const res = await db.query.itemTable.findMany({
            where: (itemTable, { eq, or, and }) =>
                and(
                    eq(itemTable.season, CURRENT_SEASON),
                    or(eq(itemTable.tierset, true), eq(itemTable.token, true))
                ),
        })
        return z.array(itemSchema).parse(res)
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
        return z.array(itemSchema).parse(res)
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
                    "itemClass",
                    "slot",
                    "slotKey",
                    "armorType",
                    "itemSubclass",
                    "token",
                    "tokenPrefix",
                    "tierset",
                    "tiersetPrefix",
                    "veryRare",
                    "boe",
                    "onUseTrinket",
                    "specs",
                    "specIds",
                    "classes",
                    "classesId",
                    "stats",
                    "mainStats",
                    "secondaryStats",
                    "wowheadUrl",
                    "iconName",
                    "iconUrl",
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
    },

    upsertCatalystMapping: async (itemsToCatalyst: ItemToCatalyst[]): Promise<void> => {
        if (itemsToCatalyst.length === 0) {
            return
        }
        await db.insert(itemToCatalystTable).values(itemsToCatalyst).onConflictDoNothing()
    },
}

export const itemNoteRepo = {
    getAll: async (): Promise<ItemNote[]> => {
        const items = await db.query.itemNoteTable.findMany()
        return z.array(itemNoteSchema).parse(items)
    },

    getById: async (id: number): Promise<ItemNote | null> => {
        const res = await db.query.itemNoteTable.findFirst({
            where: (itemNoteTable, { eq }) => eq(itemNoteTable.itemId, id),
        })
        return res ? itemNoteSchema.parse(res) : null
    },

    set: async (id: number, note: string): Promise<ItemNote> => {
        const [res] = await db
            .insert(itemNoteTable)
            .values({ itemId: id, note })
            .onConflictDoUpdate({
                target: itemNoteTable.itemId,
                set: { note },
            })
            .returning()

        return itemNoteSchema.parse(res)
    },

    delete: async (id: number): Promise<void> => {
        await db.delete(itemNoteTable).where(eq(itemNoteTable.itemId, id))
    },
}

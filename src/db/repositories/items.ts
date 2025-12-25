import { db } from "@/db"
import {
    itemNoteTable,
    itemTable,
    itemToCatalystTable,
    itemToTiersetTable,
} from "@/db/schema"
import { buildConflictUpdateColumns } from "@/db/utils"
import { CURRENT_SEASON } from "@/shared/consts/wow.consts"
import {
    itemSchema,
    itemToCatalystArraySchema,
    itemToTiersetArraySchema,
} from "@/shared/schemas/items.schema"
import { itemNoteSchema } from "@/shared/schemas/itemNote.schema"
import type { Item, ItemNote, ItemToCatalyst, ItemToTierset } from "@/shared/types/types"
import { and, eq, ilike } from "drizzle-orm"
import { z } from "zod"

// ============== ITEMS ==============

export async function getItems(): Promise<Item[]> {
    const items = await db.query.itemTable.findMany()
    return z.array(itemSchema).parse(items)
}

export async function getItem(id: number): Promise<Item | null> {
    const res = await db.query.itemTable.findFirst({
        where: (itemTable, { eq }) => eq(itemTable.id, id),
    })
    return res ? itemSchema.parse(res) : null
}

export async function getItemByIds(ids: number[]): Promise<Item[]> {
    const res = await db.query.itemTable.findMany({
        where: (itemTable, { inArray }) => inArray(itemTable.id, ids),
    })
    return z.array(itemSchema).parse(res)
}

export async function getItemToTiersetMapping(): Promise<ItemToTierset[]> {
    const result = await db.query.itemToTiersetTable.findMany()
    return itemToTiersetArraySchema.parse(result)
}

export async function getItemToCatalystMapping(): Promise<ItemToCatalyst[]> {
    const result = await db.query.itemToCatalystTable.findMany()
    return itemToCatalystArraySchema.parse(result)
}

export async function getTiersetAndTokenList(): Promise<Item[]> {
    const res = await db.query.itemTable.findMany({
        where: (itemTable, { eq, or, and }) =>
            and(
                eq(itemTable.season, CURRENT_SEASON),
                or(eq(itemTable.tierset, true), eq(itemTable.token, true))
            ),
    })
    return z.array(itemSchema).parse(res)
}

export async function searchItems(searchTerm: string, limit: number): Promise<Item[]> {
    const res = await db
        .select()
        .from(itemTable)
        .where(
            and(
                eq(itemTable.season, CURRENT_SEASON),
                eq(itemTable.sourceType, "raid"),
                ilike(itemTable.name, "%" + searchTerm + "%")
            )
        )
        .limit(limit)
    return z.array(itemSchema).parse(res)
}

export async function upsertItems(items: Item[]): Promise<void> {
    if (items.length === 0) return

    // For upsert, we need to handle each item individually to get proper conflict handling
    for (const item of items) {
        await db
            .insert(itemTable)
            .values(item)
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
    }
}

export async function deleteItemById(id: number): Promise<void> {
    await db.delete(itemTable).where(eq(itemTable.id, id))
}

export async function upsertItemsToTierset(
    itemsToTierset: ItemToTierset[]
): Promise<void> {
    if (itemsToTierset.length === 0) return
    await db.delete(itemToTiersetTable)
    await db.insert(itemToTiersetTable).values(itemsToTierset)
}

export async function upsertItemsToCatalyst(
    itemsToCatalyst: ItemToCatalyst[]
): Promise<void> {
    if (itemsToCatalyst.length === 0) return
    await db.insert(itemToCatalystTable).values(itemsToCatalyst).onConflictDoNothing()
}

// ============== ITEM NOTES ==============

export async function getAllItemNotes(): Promise<ItemNote[]> {
    const items = await db.query.itemNoteTable.findMany()
    return z.array(itemNoteSchema).parse(items)
}

export async function getItemNote(id: number): Promise<ItemNote | null> {
    const res = await db.query.itemNoteTable.findFirst({
        where: (itemNoteTable, { eq }) => eq(itemNoteTable.itemId, id),
    })
    return res ? itemNoteSchema.parse(res) : null
}

export async function setItemNote(id: number, note: string): Promise<ItemNote> {
    const [res] = await db
        .insert(itemNoteTable)
        .values({ itemId: id, note })
        .onConflictDoUpdate({
            target: itemNoteTable.itemId,
            set: { note },
        })
        .returning()

    return itemNoteSchema.parse(res)
}

export async function deleteItemNote(id: number): Promise<void> {
    await db.delete(itemNoteTable).where(eq(itemNoteTable.itemId, id))
}

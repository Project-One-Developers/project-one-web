"use server"

import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import {
    deleteItemNote,
    getAllItemNotes,
    getItem,
    getItemNote,
    getItems,
    searchItems,
    setItemNote,
} from "@/db/repositories/items"
import { itemTable } from "@/db/schema"
import { CURRENT_SEASON } from "@/shared/consts/wow.consts"
import { itemSchema } from "@/shared/schemas/items.schema"
import type { Item, ItemNote } from "@/shared/types/types"

export async function getItemsAction(): Promise<Item[]> {
    return await getItems()
}

export async function getRaidItemsAction(): Promise<Item[]> {
    const items = await db
        .select()
        .from(itemTable)
        .where(
            and(eq(itemTable.season, CURRENT_SEASON), eq(itemTable.sourceType, "raid"))
        )
    return z.array(itemSchema).parse(items)
}

export async function getItemByIdAction(id: number): Promise<Item | null> {
    return await getItem(id)
}

export async function searchItemsAction(
    searchTerm: string,
    limit: number
): Promise<Item[]> {
    return await searchItems(searchTerm, limit)
}

// ============== ITEM NOTES ==============

export async function getAllItemNotesAction(): Promise<ItemNote[]> {
    return await getAllItemNotes()
}

export async function getItemNoteAction(id: number): Promise<ItemNote | null> {
    return await getItemNote(id)
}

export async function setItemNoteAction(id: number, note: string): Promise<ItemNote> {
    return await setItemNote(id, note)
}

export async function deleteItemNoteAction(id: number): Promise<void> {
    await deleteItemNote(id)
}

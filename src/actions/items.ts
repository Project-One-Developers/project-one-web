"use server"

import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { itemNoteRepo, itemRepo } from "@/db/repositories/items"
import { itemTable } from "@/db/schema"
import { CURRENT_SEASON } from "@/shared/consts/wow.consts"
import { itemSchema } from "@/shared/schemas/items.schema"
import type { Item, ItemNote } from "@/shared/types/types"

export async function getItems(): Promise<Item[]> {
    return await itemRepo.getAll()
}

export async function getRaidItems(): Promise<Item[]> {
    const items = await db
        .select()
        .from(itemTable)
        .where(
            and(eq(itemTable.season, CURRENT_SEASON), eq(itemTable.sourceType, "raid"))
        )
    return z.array(itemSchema).parse(items)
}

export async function getItemById(id: number): Promise<Item | null> {
    return await itemRepo.getById(id)
}

export async function searchItems(searchTerm: string, limit: number): Promise<Item[]> {
    return await itemRepo.search(searchTerm, limit)
}

// ============== ITEM NOTES ==============

export async function getAllItemNotes(): Promise<ItemNote[]> {
    return await itemNoteRepo.getAll()
}

export async function getItemNote(id: number): Promise<ItemNote | null> {
    return await itemNoteRepo.getById(id)
}

export async function setItemNote(id: number, note: string): Promise<ItemNote> {
    return await itemNoteRepo.set(id, note)
}

export async function deleteItemNote(id: number): Promise<void> {
    await itemNoteRepo.delete(id)
}

import { and, eq } from "drizzle-orm"
import "server-only"
import { z } from "zod"
import { db } from "@/db"
import { itemNoteRepo, itemRepo } from "@/db/repositories/items"
import { itemTable } from "@/db/schema"
import type { ItemNote } from "@/shared/models/item-note.models"
import { itemSchema, type Item } from "@/shared/models/item.models"
import { CURRENT_SEASON } from "@/shared/wow.consts"
import { itemSyncService, type SyncItemsResult } from "./item-sync.service"

export const itemService = {
    getAll: async (): Promise<Item[]> => {
        return itemRepo.getAll()
    },

    getRaidItems: async (): Promise<Item[]> => {
        const items = await db
            .select()
            .from(itemTable)
            .where(
                and(
                    eq(itemTable.season, CURRENT_SEASON),
                    eq(itemTable.sourceType, "raid")
                )
            )
        return z.array(itemSchema).parse(items)
    },

    getById: async (id: number): Promise<Item | null> => {
        return itemRepo.getById(id)
    },

    search: async (searchTerm: string, limit: number): Promise<Item[]> => {
        return itemRepo.search(searchTerm, limit)
    },

    // ============== ITEM NOTES ==============

    getAllNotes: async (): Promise<ItemNote[]> => {
        return itemNoteRepo.getAll()
    },

    getNote: async (id: number): Promise<ItemNote | null> => {
        return itemNoteRepo.getById(id)
    },

    setNote: async (id: number, note: string): Promise<ItemNote> => {
        return itemNoteRepo.set(id, note)
    },

    deleteNote: async (id: number): Promise<void> => {
        await itemNoteRepo.delete(id)
    },

    // ============== SYNC FROM RAIDBOTS ==============

    /**
     * Sync items directly from Raidbots API
     */
    syncFromRaidbots: async (options?: {
        skipWowhead?: boolean
    }): Promise<SyncItemsResult> => {
        return itemSyncService.syncFromRaidbots(options)
    },
}

// Re-export for convenience
export type { SyncItemsResult }

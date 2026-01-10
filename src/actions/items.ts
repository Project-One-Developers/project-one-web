"use server"

import { safeAction } from "@/lib/errors/action-wrapper"
import { itemService, type SyncItemsResult } from "@/services/item.service"
import type { Item } from "@/shared/models/item.models"

export const getItemById = safeAction(async (id: number): Promise<Item | null> => {
    return itemService.getById(id)
})

export const searchItems = safeAction(
    async (searchTerm: string, limit: number): Promise<Item[]> => {
        return itemService.search(searchTerm, limit)
    }
)

// ============== ITEM NOTES ==============

export const setItemNote = safeAction(async (id: number, note: string): Promise<Item> => {
    return itemService.setNote(id, note)
})

// ============== SYNC ITEMS FROM RAIDBOTS ==============

export const syncItemsFromRaidbots = safeAction(
    async (options?: { skipWowhead?: boolean }): Promise<SyncItemsResult> => {
        return itemService.syncFromRaidbots(options)
    }
)

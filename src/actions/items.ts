"use server"

import { itemService, type SyncItemsResult } from "@/services/item.service"
import type { Item } from "@/shared/models/item.models"

export async function getItemById(id: number): Promise<Item | null> {
    return itemService.getById(id)
}

export async function searchItems(searchTerm: string, limit: number): Promise<Item[]> {
    return itemService.search(searchTerm, limit)
}

// ============== ITEM NOTES ==============

export async function setItemNote(id: number, note: string): Promise<Item> {
    return itemService.setNote(id, note)
}

// ============== SYNC ITEMS FROM RAIDBOTS ==============

/**
 * Sync items directly from Raidbots API
 */
export async function syncItemsFromRaidbots(options?: {
    skipWowhead?: boolean
}): Promise<SyncItemsResult> {
    return itemService.syncFromRaidbots(options)
}

"use server"

import type { SyncItemsResult as RaidbotsSyncResult } from "@/services/item-sync.service"
import { itemService, type SyncItemsResult } from "@/services/item.service"
import type { ItemNote } from "@/shared/models/item-note.models"
import type { Item } from "@/shared/models/item.models"

export async function getItems(): Promise<Item[]> {
    return itemService.getAll()
}

export async function getRaidItems(): Promise<Item[]> {
    return itemService.getRaidItems()
}

export async function getItemById(id: number): Promise<Item | null> {
    return itemService.getById(id)
}

export async function searchItems(searchTerm: string, limit: number): Promise<Item[]> {
    return itemService.search(searchTerm, limit)
}

// ============== ITEM NOTES ==============

export async function getAllItemNotes(): Promise<ItemNote[]> {
    return itemService.getAllNotes()
}

export async function getItemNote(id: number): Promise<ItemNote | null> {
    return itemService.getNote(id)
}

export async function setItemNote(id: number, note: string): Promise<ItemNote> {
    return itemService.setNote(id, note)
}

export async function deleteItemNote(id: number): Promise<void> {
    return itemService.deleteNote(id)
}

// ============== SYNC ITEMS FROM RAIDBOTS ==============

/**
 * Sync items directly from Raidbots API
 * This is the new preferred method that eliminates intermediate JSON files
 */
export async function syncItemsFromRaidbots(options?: {
    skipWowhead?: boolean
}): Promise<RaidbotsSyncResult> {
    return itemService.syncFromRaidbots(options)
}

// ============== SYNC ITEMS FROM JSON (LEGACY) ==============

/**
 * @deprecated Use syncItemsFromRaidbots() instead
 */
export async function syncItemsFromJson(): Promise<SyncItemsResult> {
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- keeping as fallback
    return itemService.syncFromJson()
}

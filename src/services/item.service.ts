import { readFile } from "fs/promises"
import path from "path"
import { and, eq } from "drizzle-orm"
import "server-only"
import { z } from "zod"
import { db } from "@/db"
import { bossRepo } from "@/db/repositories/bosses"
import { itemNoteRepo, itemRepo } from "@/db/repositories/items"
import { itemTable } from "@/db/schema"
import { logger } from "@/lib/logger"
import { s } from "@/shared/libs/string-utils"
import type { Boss } from "@/shared/models/boss.models"
import type { ItemNote } from "@/shared/models/item-note.models"
import {
    itemSchema,
    type Item,
    type ItemToCatalyst,
    type ItemToTierset,
} from "@/shared/models/item.models"
import type {
    WowArmorType,
    WowItemSlot,
    WowItemSlotKey,
} from "@/shared/models/wow.models"
import { CURRENT_SEASON } from "@/shared/wow.consts"

// Raw JSON item type from resources
type RawItem = {
    itemId: number
    name: string
    baseItemLevel: number
    mythicLevel: number
    heroicLevel: number
    normalLevel: number
    itemClass: string
    slot: WowItemSlot
    slotKey: WowItemSlotKey
    armorType: WowArmorType | null
    itemSubclass: string | null
    token: boolean
    tokenPrefix: string | null
    tierset: boolean
    tiersetPrefix: string | null
    veryRare: boolean
    boe: boolean
    onUseTrinket: boolean
    specs: string | null
    specIds: string | null
    classes: string | null
    classesId: string | null
    stats: string | null
    mainStats: string | null
    secondaryStats: string | null
    wowheadUrl: string
    iconName: string
    iconUrl: string
    catalyst: boolean
    sourceId: number
    sourceName: string
    sourceType: string
    journalEncounterName: string
    journalEncounterID: number
    season: number
}

// Transform raw JSON item to DB item format
function transformItem(raw: RawItem): Item {
    return {
        id: raw.itemId,
        name: raw.name,
        ilvlBase: raw.baseItemLevel,
        ilvlMythic: raw.mythicLevel,
        ilvlHeroic: raw.heroicLevel,
        ilvlNormal: raw.normalLevel,
        itemClass: raw.itemClass,
        slot: raw.slot,
        slotKey: raw.slotKey,
        armorType: raw.armorType,
        itemSubclass: raw.itemSubclass,
        token: raw.token,
        tokenPrefix: raw.tokenPrefix,
        tierset: raw.tierset,
        tiersetPrefix: raw.tiersetPrefix,
        veryRare: raw.veryRare,
        boe: raw.boe,
        onUseTrinket: raw.onUseTrinket,
        specs: raw.specs ? raw.specs.split(",") : null,
        specIds: raw.specIds ? raw.specIds.split("|").map(Number) : null,
        classes: raw.classes ? raw.classes.split(",") : null,
        classesId: raw.classesId ? raw.classesId.split("|").map(Number) : null,
        stats: raw.stats,
        mainStats: raw.mainStats,
        secondaryStats: raw.secondaryStats,
        wowheadUrl: raw.wowheadUrl,
        iconName: raw.iconName,
        iconUrl: raw.iconUrl,
        catalyzed: raw.catalyst,
        sourceId: raw.sourceId,
        sourceName: raw.sourceName,
        sourceType: raw.sourceType,
        bossName: raw.journalEncounterName,
        bossId: raw.journalEncounterID,
        season: raw.season,
    }
}

async function loadJsonFile<T>(filePath: string): Promise<T> {
    const content = await readFile(filePath, "utf-8")
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- JSON.parse returns unknown, type assertion is necessary
    return JSON.parse(content)
}

export type SyncItemsResult = {
    bosses: { success: boolean; count: number; error: string | null }
    items: { success: boolean; count: number; error: string | null }
    itemsToTierset: { success: boolean; count: number; error: string | null }
    itemsToCatalyst: { success: boolean; count: number; error: string | null }
}

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

    // ============== SYNC FROM JSON ==============

    syncFromJson: async (): Promise<SyncItemsResult> => {
        logger.info("ItemService", `Items sync started at ${new Date().toISOString()}`)

        const resourcesPath = path.join(process.cwd(), "resources", "wow")
        const seasons = ["s1", "s2", "s3"]

        const results: SyncItemsResult = {
            bosses: { success: false, count: 0, error: null },
            items: { success: false, count: 0, error: null },
            itemsToTierset: { success: false, count: 0, error: null },
            itemsToCatalyst: { success: false, count: 0, error: null },
        }

        // Load and upsert bosses from all seasons
        try {
            const allBosses: Boss[] = []
            for (const season of seasons) {
                const bossesPath = path.join(resourcesPath, season, "bosses.json")
                try {
                    const bosses = await loadJsonFile<Boss[]>(bossesPath)
                    allBosses.push(...bosses)
                } catch {
                    logger.debug("ItemService", `No bosses.json found for ${season}`)
                }
            }
            // Deduplicate by id
            const uniqueBosses = Array.from(
                new Map(allBosses.map((b) => [b.id, b])).values()
            )
            await bossRepo.upsert(uniqueBosses)
            results.bosses.success = true
            results.bosses.count = uniqueBosses.length
        } catch (error) {
            results.bosses.error =
                error instanceof Error ? error.message : "Unknown error"
            logger.error("ItemService", `Failed to sync bosses: ${s(error)}`)
        }

        // Load and upsert items from all seasons
        try {
            const allItems: Item[] = []
            for (const season of seasons) {
                const itemsPath = path.join(resourcesPath, season, "items.json")
                try {
                    const rawItems = await loadJsonFile<RawItem[]>(itemsPath)
                    const items = rawItems.map(transformItem)
                    allItems.push(...items)
                } catch {
                    logger.debug("ItemService", `No items.json found for ${season}`)
                }
            }
            // Deduplicate by id (newer seasons override older)
            const uniqueItems = Array.from(
                new Map(allItems.map((i) => [i.id, i])).values()
            )
            await itemRepo.upsert(uniqueItems)
            results.items.success = true
            results.items.count = uniqueItems.length
        } catch (error) {
            results.items.error = error instanceof Error ? error.message : "Unknown error"
            logger.error("ItemService", `Failed to sync items: ${s(error)}`)
        }

        // Load and upsert items_to_tierset from all seasons
        try {
            const allTierset: ItemToTierset[] = []
            for (const season of seasons) {
                const tiersetPath = path.join(
                    resourcesPath,
                    season,
                    "items_to_tierset.json"
                )
                try {
                    const tierset = await loadJsonFile<ItemToTierset[]>(tiersetPath)
                    allTierset.push(...tierset)
                } catch {
                    logger.debug(
                        "ItemService",
                        `No items_to_tierset.json found for ${season}`
                    )
                }
            }
            // Deduplicate by itemId
            const uniqueTierset = Array.from(
                new Map(allTierset.map((t) => [t.itemId, t])).values()
            )
            await itemRepo.upsertTiersetMapping(uniqueTierset)
            results.itemsToTierset.success = true
            results.itemsToTierset.count = uniqueTierset.length
        } catch (error) {
            results.itemsToTierset.error =
                error instanceof Error ? error.message : "Unknown error"
            logger.error("ItemService", `Failed to sync items_to_tierset: ${s(error)}`)
        }

        // Load and upsert items_to_catalyst from all seasons
        try {
            const allCatalyst: ItemToCatalyst[] = []
            for (const season of seasons) {
                const catalystPath = path.join(
                    resourcesPath,
                    season,
                    "items_to_catalyst.json"
                )
                try {
                    const catalyst = await loadJsonFile<ItemToCatalyst[]>(catalystPath)
                    allCatalyst.push(...catalyst)
                } catch {
                    logger.debug(
                        "ItemService",
                        `No items_to_catalyst.json found for ${season}`
                    )
                }
            }
            await itemRepo.upsertCatalystMapping(allCatalyst)
            results.itemsToCatalyst.success = true
            results.itemsToCatalyst.count = allCatalyst.length
        } catch (error) {
            results.itemsToCatalyst.error =
                error instanceof Error ? error.message : "Unknown error"
            logger.error("ItemService", `Failed to sync items_to_catalyst: ${s(error)}`)
        }

        logger.info("ItemService", `Items sync completed: ${s(results)}`)

        return results
    },
}

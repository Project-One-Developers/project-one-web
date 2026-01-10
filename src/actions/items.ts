"use server"

import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { bonusItemTrackRepo } from "@/db/repositories/bonus-item-tracks"
import { bossRepo } from "@/db/repositories/bosses"
import { itemRepo } from "@/db/repositories/items"
import { itemTable } from "@/db/schema"
import { safeAction } from "@/lib/errors/action-wrapper"
import { logger } from "@/lib/logger"
import { processBonuses } from "@/lib/server/bonus-processing"
import { invalidateBonusTracksCache } from "@/lib/server/bonus-tracks"
import {
    buildEncounterMap,
    filterInstances,
    enrichItem,
    buildTiersetMappings,
    buildCatalystMappings,
    type EncounterMap,
} from "@/lib/server/item-enrichment"
import { raidbotsStaticApi } from "@/lib/server/raidbots-static-api"
import type {
    RaidbotsItem,
    RaidbotsInstance,
} from "@/lib/server/schemas/raidbots-static.schema"
import { scrapeWowheadBatch, type WowheadItemData } from "@/lib/server/wowhead-scraper"
import { SOURCE_TYPES_TO_MATCH } from "@/shared/libs/items/raid-config"
import { CURRENT_SEASON, getRaidIdsByCatalystId } from "@/shared/libs/season-config"
import { toSlug } from "@/shared/libs/slug-utils"
import { s } from "@/shared/libs/string-utils"
import type { Boss } from "@/shared/models/boss.models"
import { itemSchema, type Item, type ItemToCatalyst } from "@/shared/models/item.models"

// ============== TYPES ==============

export type SyncItemsResult = {
    bosses: { success: boolean; count: number; error: string | null }
    items: { success: boolean; count: number; error: string | null }
    itemsToTierset: { success: boolean; count: number; error: string | null }
    itemsToCatalyst: { success: boolean; count: number; error: string | null }
    bonusItemTracks: { success: boolean; count: number; error: string | null }
}

type SyncOptions = {
    skipWowhead?: boolean
    defaultSeason?: number
    onProgress?: (stage: string, progress: number, total: number) => void
}

type SyncResultEntry = { success: boolean; count: number; error: string | null }

// ============== HELPER FUNCTIONS ==============

function filterItems(items: RaidbotsItem[], encounterMap: EncounterMap): RaidbotsItem[] {
    return items.filter((item) => {
        return item.sources.some((source) => {
            const context = encounterMap.get(source.encounterId)
            if (!context) {
                return false
            }
            return SOURCE_TYPES_TO_MATCH.has(context.instance.type)
        })
    })
}

async function upsertWithTracking<T>(
    name: string,
    data: T[],
    upsertFn: (data: T[]) => Promise<void>,
    result: SyncResultEntry,
    onSuccess?: () => void
): Promise<void> {
    try {
        await upsertFn(data)
        result.success = true
        result.count = data.length
        onSuccess?.()
        logger.info("ItemSync", `Upserted ${s(data.length)} ${name}`)
    } catch (error) {
        result.error = error instanceof Error ? error.message : "Unknown error"
        logger.error("ItemSync", `Failed to upsert ${name}: ${s(error)}`)
    }
}

function buildBosses(instances: RaidbotsInstance[]): Boss[] {
    const bosses: Boss[] = []

    for (const instance of instances) {
        if (!instance.encounters) {
            continue
        }

        for (const encounter of instance.encounters) {
            bosses.push({
                id: encounter.id,
                name: encounter.name,
                instanceName: instance.name,
                instanceType: instance.type,
                instanceId: instance.id,
                order: encounter.order ?? 0,
                raidSlug: toSlug(instance.name),
                encounterSlug: toSlug(encounter.name),
                blizzardEncounterId: null,
            })
        }
    }

    return bosses
}

async function syncItemsFromRaidbots(
    options: SyncOptions = {}
): Promise<SyncItemsResult> {
    const defaultSeason = options.defaultSeason ?? CURRENT_SEASON
    const startTime = Date.now()

    logger.info(
        "ItemSync",
        `Starting Raidbots sync (season=${s(defaultSeason)}, skipWowhead=${s(options.skipWowhead ?? false)})`
    )

    const results: SyncItemsResult = {
        bosses: { success: false, count: 0, error: null },
        items: { success: false, count: 0, error: null },
        itemsToTierset: { success: false, count: 0, error: null },
        itemsToCatalyst: { success: false, count: 0, error: null },
        bonusItemTracks: { success: false, count: 0, error: null },
    }

    try {
        // Step 1: Fetch all Raidbots data in parallel
        logger.info("ItemSync", "Fetching Raidbots data...")
        options.onProgress?.("fetch", 0, 3)

        const { encounterItems, instances, bonuses } = await raidbotsStaticApi.fetchAll()

        logger.info(
            "ItemSync",
            `Fetched ${s(encounterItems.length)} items, ${s(instances.length)} instances, ${s(Object.keys(bonuses).length)} bonuses`
        )
        options.onProgress?.("fetch", 3, 3)

        // Step 2: Build encounter context and filter instances
        logger.info("ItemSync", "Building encounter context...")
        const filteredInstances = filterInstances(instances)
        const encounterMap = buildEncounterMap(filteredInstances)
        logger.info("ItemSync", `Built context for ${s(encounterMap.size)} encounters`)

        // Step 3: Filter items
        logger.info("ItemSync", "Filtering items...")
        const filteredItems = filterItems(encounterItems, encounterMap)
        logger.info(
            "ItemSync",
            `Filtered to ${s(filteredItems.length)} items (from ${s(encounterItems.length)})`
        )

        // Step 4: Scrape Wowhead (optional)
        let wowheadData = new Map<number, WowheadItemData>()

        if (!options.skipWowhead) {
            logger.info("ItemSync", "Scraping Wowhead for additional data...")
            const itemIds = filteredItems.map((item) => item.id)

            wowheadData = await scrapeWowheadBatch(itemIds, {
                onProgress: (completed, total) => {
                    options.onProgress?.("wowhead", completed, total)
                },
            })

            logger.info("ItemSync", `Scraped ${s(wowheadData.size)} items from Wowhead`)
        } else {
            logger.info("ItemSync", "Skipping Wowhead scraping")
        }

        // Step 5: Enrich items
        logger.info("ItemSync", "Enriching items...")
        const enrichedItems: Item[] = []
        let enrichFailed = 0

        for (const rawItem of filteredItems) {
            let context = null
            for (const source of rawItem.sources) {
                context = encounterMap.get(source.encounterId)
                if (context) {
                    break
                }
            }

            if (!context) {
                enrichFailed++
                continue
            }

            const wowhead = wowheadData.get(rawItem.id) ?? null
            const enriched = enrichItem(rawItem, context, wowhead, defaultSeason)

            if (enriched) {
                enrichedItems.push(enriched)
            } else {
                enrichFailed++
            }
        }

        logger.info(
            "ItemSync",
            `Enriched ${s(enrichedItems.length)} items (${s(enrichFailed)} failed)`
        )

        // Step 6: Build tierset mappings
        logger.info("ItemSync", "Building tierset mappings...")
        const tiersetMappings = buildTiersetMappings(filteredItems, encounterItems)

        // Step 7: Build catalyst mappings
        logger.info("ItemSync", "Building catalyst mappings...")

        const catalystItems = enrichedItems.filter((item) => item.catalyzed)
        const raidItems = enrichedItems.filter(
            (item) => item.sourceType === "raid" && !item.catalyzed
        )

        const catalystsBySource = new Map<number, Item[]>()
        for (const catalystItem of catalystItems) {
            const existing = catalystsBySource.get(catalystItem.sourceId) ?? []
            existing.push(catalystItem)
            catalystsBySource.set(catalystItem.sourceId, existing)
        }

        const catalystMappings: ItemToCatalyst[] = []
        for (const [catalystSourceId, sourceCatalystItems] of catalystsBySource) {
            const raidIds = getRaidIdsByCatalystId(catalystSourceId)
            const matchingRaidItems = raidItems.filter((item) =>
                raidIds.includes(item.sourceId)
            )

            const matchedMappings = buildCatalystMappings(
                sourceCatalystItems,
                matchingRaidItems,
                filteredItems
            )

            catalystMappings.push(...matchedMappings)
        }

        logger.info("ItemSync", `Built ${s(catalystMappings.length)} catalyst mappings`)

        // Step 8: Build bosses list
        logger.info("ItemSync", "Building bosses list...")
        const bosses = buildBosses(filteredInstances)
        logger.info("ItemSync", `Built ${s(bosses.length)} bosses`)

        // Step 9: Process bonuses
        logger.info("ItemSync", "Processing bonuses...")
        const bonusTracks = processBonuses(bonuses)
        logger.info("ItemSync", `Processed ${s(bonusTracks.length)} bonus tracks`)

        // Step 10: Upsert all to database
        logger.info("ItemSync", "Upserting to database...")

        await upsertWithTracking("bosses", bosses, bossRepo.upsert, results.bosses)
        await upsertWithTracking("items", enrichedItems, itemRepo.upsert, results.items)
        await upsertWithTracking(
            "tierset mappings",
            tiersetMappings,
            itemRepo.upsertTiersetMapping,
            results.itemsToTierset
        )
        await upsertWithTracking(
            "catalyst mappings",
            catalystMappings,
            itemRepo.upsertCatalystMapping,
            results.itemsToCatalyst
        )
        await upsertWithTracking(
            "bonus tracks",
            bonusTracks,
            bonusItemTrackRepo.upsert,
            results.bonusItemTracks,
            invalidateBonusTracksCache
        )

        const elapsed = Date.now() - startTime
        logger.info("ItemSync", `Sync completed in ${s(elapsed)}ms: ${s(results)}`)
    } catch (error) {
        logger.error("ItemSync", `Fatal error during sync: ${s(error)}`)

        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        if (!results.bosses.success) {
            results.bosses.error = errorMessage
        }
        if (!results.items.success) {
            results.items.error = errorMessage
        }
        if (!results.itemsToTierset.success) {
            results.itemsToTierset.error = errorMessage
        }
        if (!results.itemsToCatalyst.success) {
            results.itemsToCatalyst.error = errorMessage
        }
        if (!results.bonusItemTracks.success) {
            results.bonusItemTracks.error = errorMessage
        }
    }

    return results
}

// ============== ACTIONS ==============

export const getItemById = safeAction(async (id: number): Promise<Item | null> => {
    return itemRepo.getById(id)
})

export const searchItems = safeAction(
    async (searchTerm: string, limit: number): Promise<Item[]> => {
        return itemRepo.search(searchTerm, limit)
    }
)

export const getRaidItems = safeAction(async (): Promise<Item[]> => {
    const items = await db
        .select()
        .from(itemTable)
        .where(
            and(eq(itemTable.season, CURRENT_SEASON), eq(itemTable.sourceType, "raid"))
        )
    return z.array(itemSchema).parse(items)
})

// ============== ITEM NOTES ==============

export const setItemNote = safeAction(async (id: number, note: string): Promise<Item> => {
    return itemRepo.setNote(id, note)
})

export const deleteItemNote = safeAction(async (id: number): Promise<void> => {
    await itemRepo.deleteNote(id)
})

// ============== SYNC ITEMS FROM RAIDBOTS ==============

export const syncFromRaidbots = safeAction(
    async (options?: { skipWowhead?: boolean }): Promise<SyncItemsResult> => {
        return syncItemsFromRaidbots(options)
    }
)

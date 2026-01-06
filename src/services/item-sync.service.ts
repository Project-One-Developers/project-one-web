/**
 * Item Sync Service
 * Orchestrates the full pipeline for syncing items from Raidbots API to database
 * Replaces the previous Python script + JSON file flow
 */
import "server-only"
import { bonusItemTrackRepo } from "@/db/repositories/bonus-item-tracks"
import { bossRepo } from "@/db/repositories/bosses"
import { itemRepo } from "@/db/repositories/items"
import { logger } from "@/lib/logger"
import { SOURCE_TYPES_TO_MATCH } from "@/shared/libs/items/raid-config"
import { CURRENT_SEASON, getRaidIdsByCatalystId } from "@/shared/libs/season-config"
import { toSlug } from "@/shared/libs/slug-utils"
import { s } from "@/shared/libs/string-utils"
import type { Boss } from "@/shared/models/boss.models"
import type { Item, ItemToCatalyst } from "@/shared/models/item.models"
import { processBonuses } from "./libs/bonus-processing"
import { invalidateBonusTracksCache } from "./libs/bonus-tracks"
import {
    buildEncounterMap,
    filterInstances,
    enrichItem,
    buildTiersetMappings,
    buildCatalystMappings,
    type EncounterMap,
} from "./libs/item-enrichment"
import { raidbotsStaticApi } from "./libs/raidbots-static-api"
import type {
    RaidbotsItem,
    RaidbotsInstance,
} from "./libs/schemas/raidbots-static.schema"
import { scrapeWowheadBatch, type WowheadItemData } from "./libs/wowhead-scraper"

// ============================================================================
// Types
// ============================================================================

export type SyncItemsResult = {
    bosses: { success: boolean; count: number; error: string | null }
    items: { success: boolean; count: number; error: string | null }
    itemsToTierset: { success: boolean; count: number; error: string | null }
    itemsToCatalyst: { success: boolean; count: number; error: string | null }
    bonusItemTracks: { success: boolean; count: number; error: string | null }
}

type SyncOptions = {
    /** Skip Wowhead scraping (faster but less data) */
    skipWowhead?: boolean
    /** Season to use for items without explicit season (defaults to CURRENT_SEASON) */
    defaultSeason?: number
    /** Progress callback for long operations */
    onProgress?: (stage: string, progress: number, total: number) => void
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Filter items that have at least one source from a valid encounter
 * Note: Blacklisted instances are already filtered out by filterInstances()
 */
function filterItems(items: RaidbotsItem[], encounterMap: EncounterMap): RaidbotsItem[] {
    return items.filter((item) => {
        // Check if any source matches our criteria
        return item.sources.some((source) => {
            // Check if we have context for this encounter
            const context = encounterMap.get(source.encounterId)
            if (!context) {
                return false
            }

            // Check if instance type is one we care about
            return SOURCE_TYPES_TO_MATCH.has(context.instance.type)
        })
    })
}

// ============================================================================
// Upsert Helper
// ============================================================================

type SyncResultEntry = { success: boolean; count: number; error: string | null }

/**
 * Helper to upsert data with standardized error handling and tracking
 */
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
        logger.info("ItemSyncService", `Upserted ${s(data.length)} ${name}`)
    } catch (error) {
        result.error = error instanceof Error ? error.message : "Unknown error"
        logger.error("ItemSyncService", `Failed to upsert ${name}: ${s(error)}`)
    }
}

// ============================================================================
// Boss Building
// ============================================================================

/**
 * Build bosses list from instances
 */
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
                blizzardEncounterId: null, // Not available from Raidbots
            })
        }
    }

    return bosses
}

// ============================================================================
// Main Sync Service
// ============================================================================

export const itemSyncService = {
    /**
     * Full sync from Raidbots API to database
     * This replaces the old Python script + JSON file approach
     */
    syncFromRaidbots: async (options: SyncOptions = {}): Promise<SyncItemsResult> => {
        const defaultSeason = options.defaultSeason ?? CURRENT_SEASON
        const startTime = Date.now()

        logger.info(
            "ItemSyncService",
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
            // ================================================================
            // Step 1: Fetch all Raidbots data in parallel
            // ================================================================
            logger.info("ItemSyncService", "Fetching Raidbots data...")
            options.onProgress?.("fetch", 0, 3)

            const { encounterItems, instances, bonuses } =
                await raidbotsStaticApi.fetchAll()

            logger.info(
                "ItemSyncService",
                `Fetched ${s(encounterItems.length)} items, ${s(instances.length)} instances, ${s(Object.keys(bonuses).length)} bonuses`
            )
            options.onProgress?.("fetch", 3, 3)

            // ================================================================
            // Step 2: Build encounter context and filter instances
            // ================================================================
            logger.info("ItemSyncService", "Building encounter context...")
            const filteredInstances = filterInstances(instances)
            const encounterMap = buildEncounterMap(filteredInstances)
            logger.info(
                "ItemSyncService",
                `Built context for ${s(encounterMap.size)} encounters`
            )

            // ================================================================
            // Step 3: Filter items
            // ================================================================
            logger.info("ItemSyncService", "Filtering items...")
            const filteredItems = filterItems(encounterItems, encounterMap)
            logger.info(
                "ItemSyncService",
                `Filtered to ${s(filteredItems.length)} items (from ${s(encounterItems.length)})`
            )

            // ================================================================
            // Step 4: Scrape Wowhead (optional)
            // ================================================================
            let wowheadData = new Map<number, WowheadItemData>()

            if (!options.skipWowhead) {
                logger.info("ItemSyncService", "Scraping Wowhead for additional data...")
                const itemIds = filteredItems.map((item) => item.id)

                wowheadData = await scrapeWowheadBatch(itemIds, {
                    onProgress: (completed, total) => {
                        options.onProgress?.("wowhead", completed, total)
                    },
                })

                logger.info(
                    "ItemSyncService",
                    `Scraped ${s(wowheadData.size)} items from Wowhead`
                )
            } else {
                logger.info("ItemSyncService", "Skipping Wowhead scraping")
            }

            // ================================================================
            // Step 5: Enrich items
            // ================================================================
            logger.info("ItemSyncService", "Enriching items...")
            const enrichedItems: Item[] = []
            let enrichFailed = 0

            for (const rawItem of filteredItems) {
                // Find the first valid source's context
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
                "ItemSyncService",
                `Enriched ${s(enrichedItems.length)} items (${s(enrichFailed)} failed)`
            )

            // ================================================================
            // Step 6: Build tierset mappings
            // ================================================================
            logger.info("ItemSyncService", "Building tierset mappings...")
            const tiersetMappings = buildTiersetMappings(filteredItems, encounterItems)

            // ================================================================
            // Step 7: Build catalyst mappings (optimized)
            // ================================================================
            logger.info("ItemSyncService", "Building catalyst mappings...")

            // Get catalyst items and raid items separately
            const catalystItems = enrichedItems.filter((item) => item.catalyzed)
            const raidItems = enrichedItems.filter(
                (item) => item.sourceType === "raid" && !item.catalyzed
            )

            // Group catalyst items by sourceId to batch the mapping calls
            const catalystsBySource = new Map<number, Item[]>()
            for (const catalystItem of catalystItems) {
                const existing = catalystsBySource.get(catalystItem.sourceId) ?? []
                existing.push(catalystItem)
                catalystsBySource.set(catalystItem.sourceId, existing)
            }

            // Build mappings per catalyst source (typically just 1-3 sources)
            const catalystMappings: ItemToCatalyst[] = []
            for (const [catalystSourceId, sourceCatalystItems] of catalystsBySource) {
                // Get the raid IDs that this catalyst source applies to
                const raidIds = getRaidIdsByCatalystId(catalystSourceId)
                const matchingRaidItems = raidItems.filter((item) =>
                    raidIds.includes(item.sourceId)
                )

                // Build mappings for all catalyst items from this source at once
                const matchedMappings = buildCatalystMappings(
                    sourceCatalystItems,
                    matchingRaidItems,
                    filteredItems
                )

                catalystMappings.push(...matchedMappings)
            }

            logger.info(
                "ItemSyncService",
                `Built ${s(catalystMappings.length)} catalyst mappings`
            )

            // ================================================================
            // Step 8: Build bosses list
            // ================================================================
            logger.info("ItemSyncService", "Building bosses list...")
            const bosses = buildBosses(filteredInstances)
            logger.info("ItemSyncService", `Built ${s(bosses.length)} bosses`)

            // ================================================================
            // Step 9: Process bonuses
            // ================================================================
            logger.info("ItemSyncService", "Processing bonuses...")
            const bonusTracks = processBonuses(bonuses)
            logger.info(
                "ItemSyncService",
                `Processed ${s(bonusTracks.length)} bonus tracks`
            )

            // ================================================================
            // Step 10: Upsert all to database
            // ================================================================
            logger.info("ItemSyncService", "Upserting to database...")

            await upsertWithTracking("bosses", bosses, bossRepo.upsert, results.bosses)
            await upsertWithTracking(
                "items",
                enrichedItems,
                itemRepo.upsert,
                results.items
            )
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
                invalidateBonusTracksCache // Invalidate cache on success
            )

            const elapsed = Date.now() - startTime
            logger.info(
                "ItemSyncService",
                `Sync completed in ${s(elapsed)}ms: ${s(results)}`
            )
        } catch (error) {
            logger.error("ItemSyncService", `Fatal error during sync: ${s(error)}`)

            // Mark all as failed if we hit a fatal error
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
    },
}

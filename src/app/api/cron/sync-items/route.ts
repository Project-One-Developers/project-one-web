import { readFile } from "fs/promises"
import path from "path"
import { NextResponse } from "next/server"
import { bossRepo } from "@/db/repositories/bosses"
import { itemRepo } from "@/db/repositories/items"
import { env } from "@/env"
import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"
import type { Boss } from "@/shared/models/boss.model"
import type { Item, ItemToCatalyst, ItemToTierset } from "@/shared/models/item.model"
import type { WowArmorType, WowItemSlot, WowItemSlotKey } from "@/shared/models/wow.model"

// Verify this is a cron request from Vercel or local dev
function verifyCronSecret(request: Request): boolean {
    // Allow in development
    if (process.env.NODE_ENV === "development") {
        return true
    }
    if (!env.CRON_SECRET) {
        return false
    }
    const authHeader = request.headers.get("authorization")
    return authHeader === `Bearer ${env.CRON_SECRET}`
}

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

export async function GET(request: Request) {
    if (!verifyCronSecret(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        logger.info("SyncItems", `Items sync started at ${new Date().toISOString()}`)

        const resourcesPath = path.join(process.cwd(), "resources", "wow")
        const seasons = ["s1", "s2", "s3"]

        const results = {
            bosses: { success: false, count: 0, error: null as string | null },
            items: { success: false, count: 0, error: null as string | null },
            itemsToTierset: { success: false, count: 0, error: null as string | null },
            itemsToCatalyst: { success: false, count: 0, error: null as string | null },
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
                    logger.debug("SyncItems", `No bosses.json found for ${season}`)
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
            logger.error("SyncItems", `Failed to sync bosses: ${s(error)}`)
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
                    logger.debug("SyncItems", `No items.json found for ${season}`)
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
            logger.error("SyncItems", `Failed to sync items: ${s(error)}`)
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
                        "SyncItems",
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
            logger.error("SyncItems", `Failed to sync items_to_tierset: ${s(error)}`)
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
                        "SyncItems",
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
            logger.error("SyncItems", `Failed to sync items_to_catalyst: ${s(error)}`)
        }

        logger.info("SyncItems", `Items sync completed: ${s(results)}`)

        return NextResponse.json({
            success: true,
            message: "Items sync completed",
            results,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        logger.error("SyncItems", `Items sync failed: ${s(error)}`)
        return NextResponse.json(
            {
                error: "Sync failed",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        )
    }
}

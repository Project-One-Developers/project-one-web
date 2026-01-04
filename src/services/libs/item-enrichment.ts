/**
 * Item enrichment module
 * Transforms Raidbots API items into our database format
 * Ported from Python raid-items script (enrichment.py)
 */
import "server-only"
import { match, P } from "ts-pattern"
import { logger } from "@/lib/logger"
import { defined } from "@/lib/utils"
import {
    ITEM_CLASS_MAP,
    ITEM_CLASSES,
    INVENTORY_TYPE_IDS,
    ARMOR_TYPE_MAP,
    WEAPON_TYPE_MAP,
    INVENTORY_TYPE_MAP,
    expandSpecsToClasses,
} from "@/shared/libs/items/item-mappings"
import { SOURCE_TYPES_TO_MATCH } from "@/shared/libs/items/raid-config"
import { getItemLevelsForBoss, determineItemSeason } from "@/shared/libs/season-config"
import { s } from "@/shared/libs/string-utils"
import type { Item, ItemToCatalyst, ItemToTierset } from "@/shared/models/item.models"
import { type WowArmorType, type WowItemSlotKey } from "@/shared/models/wow.models"
import type {
    RaidbotsItem,
    RaidbotsInstance,
    RaidbotsEncounter,
} from "./schemas/raidbots-static.schema"
import type { WowheadItemData } from "./wowhead-scraper"

// ============================================================================
// Item Classification Types
// ============================================================================

type ItemClassification = {
    itemSubclass: string | null
    armorType: WowArmorType | null
    isToken: boolean
}

/**
 * Determine the slot key for an item
 * Tokens and items without inventoryType default to "omni"
 */
function getSlotKey(rawItem: RaidbotsItem): WowItemSlotKey {
    // Reagent tokens are always omni
    if (rawItem.itemClass === ITEM_CLASSES.REAGENT && rawItem.itemSubClass === 2) {
        return "omni"
    }
    // Items without inventoryType (tokens) are omni
    if (rawItem.inventoryType === undefined) {
        return "omni"
    }
    return INVENTORY_TYPE_MAP[rawItem.inventoryType]?.slotKey ?? "omni"
}

/**
 * Classify an item based on its class and subclass
 * Uses ts-pattern for cleaner pattern matching
 */
function classifyItem(rawItem: RaidbotsItem): ItemClassification {
    return match<[number, number], ItemClassification>([
        rawItem.itemClass,
        rawItem.itemSubClass,
    ])
        .with([ITEM_CLASSES.WEAPON, P._], () => {
            const weaponInfo = WEAPON_TYPE_MAP[rawItem.itemSubClass]
            return {
                itemSubclass: weaponInfo ?? null,
                armorType: null,
                isToken: false,
            }
        })
        .with([ITEM_CLASSES.ARMOR, P._], () => {
            const armorInfo = ARMOR_TYPE_MAP[rawItem.itemSubClass]
            return {
                itemSubclass: armorInfo?.subclass ?? null,
                armorType: armorInfo?.armorType ?? null,
                isToken: false,
            }
        })
        .with([ITEM_CLASSES.REAGENT, 2], () => ({
            itemSubclass: "Token",
            armorType: null,
            isToken: true,
        }))
        .with([ITEM_CLASSES.MISCELLANEOUS, 0], () => ({
            itemSubclass: "Token",
            armorType: null,
            isToken: true,
        }))
        .otherwise(() => ({
            itemSubclass: null,
            armorType: null,
            isToken: false,
        }))
}

// ============================================================================
// Types
// ============================================================================

export type EncounterContext = {
    encounter: RaidbotsEncounter
    instance: RaidbotsInstance
}

export type EncounterMap = Map<number, EncounterContext>

export type EnrichmentResult = {
    items: Item[]
    tiersetMappings: ItemToTierset[]
    catalystMappings: ItemToCatalyst[]
}

// ============================================================================
// Encounter Context Building
// ============================================================================

/**
 * Build a map of encounterId -> EncounterContext from instances data
 */
export function buildEncounterMap(instances: RaidbotsInstance[]): EncounterMap {
    return new Map(
        instances.flatMap((instance) =>
            (instance.encounters ?? []).map((encounter) => [
                encounter.id,
                { encounter, instance },
            ])
        )
    )
}

/**
 * Filter instances to only include types we care about
 */
export function filterInstances(instances: RaidbotsInstance[]): RaidbotsInstance[] {
    return instances.filter((inst) => SOURCE_TYPES_TO_MATCH.has(inst.type))
}

// ============================================================================
// Item Enrichment
// ============================================================================

/**
 * Enrich a single Raidbots item into our database format
 */
export function enrichItem(
    rawItem: RaidbotsItem,
    context: EncounterContext,
    wowheadData: WowheadItemData | null,
    defaultSeason: number
): Item | null {
    try {
        const { encounter, instance } = context

        // Get item class description
        const itemClassDesc = ITEM_CLASS_MAP[rawItem.itemClass]
        if (!itemClassDesc) {
            logger.warn(
                "ItemEnrichment",
                `Unknown itemClass ${s(rawItem.itemClass)} for item ${s(rawItem.name)}`
            )
            return null
        }

        // Classify item using ts-pattern-based helper
        const classification = classifyItem(rawItem)
        const { armorType, isToken } = classification

        // Determine subclass (special slots override classification)
        const itemSubclass = match(rawItem.inventoryType)
            .with(INVENTORY_TYPE_IDS.TRINKET, () => "Trinket")
            .with(
                INVENTORY_TYPE_IDS.NECK,
                INVENTORY_TYPE_IDS.BACK,
                INVENTORY_TYPE_IDS.FINGER,
                () => null
            )
            .otherwise(() => classification.itemSubclass)

        const slotKey = getSlotKey(rawItem)

        // Determine if it's a tierset piece
        const isTierset =
            defined(rawItem.itemSetId) && rawItem.allowableClasses?.length === 1

        // Determine item levels
        const isVeryRare = rawItem.sources.some((src) => src.veryRare)
        const bossOrder = encounter.order ?? 0
        // Determine if catalyzed item
        const isCatalyzed = instance.type === "catalyst"
        const isBoeOrCatalyst = bossOrder === 99 || isCatalyzed

        const raidLevels =
            instance.type === "raid"
                ? getItemLevelsForBoss(
                      instance.id,
                      bossOrder,
                      isVeryRare,
                      isBoeOrCatalyst
                  )
                : null
        const ilvlNormal = raidLevels?.normal ?? rawItem.itemLevel
        const ilvlHeroic = raidLevels?.heroic ?? rawItem.itemLevel
        const ilvlMythic = raidLevels?.mythic ?? rawItem.itemLevel

        // Determine season
        const season = determineItemSeason(instance.id, encounter.id, defaultSeason)

        // Expand specs to classes
        const specIds = rawItem.specs ?? wowheadData?.specs ?? []
        const { classNames } = expandSpecsToClasses(specIds)

        return {
            id: rawItem.id,
            name: rawItem.name,
            ilvlBase: rawItem.itemLevel,
            ilvlNormal,
            ilvlHeroic,
            ilvlMythic,
            slotKey,
            itemSubclass,
            armorType,
            tierset: isTierset,
            token: isToken,
            veryRare: isVeryRare,
            catalyzed: isCatalyzed,
            specIds: specIds.length > 0 ? specIds : null,
            classes: classNames.length > 0 ? classNames : null,
            iconName: rawItem.icon,
            bossName: encounter.name,
            bossId: encounter.id,
            sourceId: instance.id,
            sourceName: instance.name,
            sourceType: instance.type,
            season,
        }
    } catch (error) {
        logger.error(
            "ItemEnrichment",
            `Failed to enrich item ${s(rawItem.id)} (${rawItem.name}): ${s(error)}`
        )
        return null
    }
}

// ============================================================================
// Tierset Mapping
// ============================================================================

/**
 * Build tierset mappings from token items
 * Maps token items to the items they can generate
 */
export function buildTiersetMappings(
    items: RaidbotsItem[],
    allItems: RaidbotsItem[]
): ItemToTierset[] {
    const mappings: ItemToTierset[] = []
    const itemLookup = new Map(allItems.map((item) => [item.id, item]))

    for (const item of items) {
        // Check if this is a token with contains
        if (!item.contains || item.contains.length === 0) {
            continue
        }

        for (const containedItemId of item.contains) {
            const containedItem = itemLookup.get(containedItemId)
            if (!containedItem) {
                logger.debug(
                    "ItemEnrichment",
                    `Token ${s(item.id)} references unknown item ${s(containedItemId)}`
                )
                continue
            }

            // Get the class from the contained item
            if (containedItem.allowableClasses?.length === 1) {
                const classId = containedItem.allowableClasses[0]
                if (classId !== undefined) {
                    mappings.push({
                        tokenId: item.id,
                        itemId: containedItemId,
                        classId,
                    })
                }
            }
        }
    }

    logger.info("ItemEnrichment", `Built ${s(mappings.length)} tierset mappings`)
    return mappings
}

// ============================================================================
// Catalyst Mapping
// ============================================================================

/**
 * Build a composite key for item slot matching
 */
function slotKey(inventoryType: number, itemSubClass: number): string {
    return `${String(inventoryType)}:${String(itemSubClass)}`
}

/**
 * Build catalyst mappings (optimized O(n+m) approach)
 * Maps raid items to their catalyst-upgraded versions
 *
 * Uses pre-indexed lookups instead of nested loops for better performance.
 */
export function buildCatalystMappings(
    catalystItems: Item[],
    raidItems: Item[],
    rawItems: RaidbotsItem[]
): ItemToCatalyst[] {
    const mappings: ItemToCatalyst[] = []

    // Build lookup for raw items by ID
    const rawItemLookup = new Map(rawItems.map((item) => [item.id, item]))

    // Pre-index raid items by (inventoryType, itemSubClass) for O(1) lookup
    const raidItemsBySlot = new Map<string, { item: Item; raw: RaidbotsItem }[]>()
    for (const raidItem of raidItems) {
        const rawRaidItem = rawItemLookup.get(raidItem.id)
        if (rawRaidItem?.inventoryType === undefined) {
            continue
        }

        const key = slotKey(rawRaidItem.inventoryType, rawRaidItem.itemSubClass)
        const existing = raidItemsBySlot.get(key) ?? []
        existing.push({ item: raidItem, raw: rawRaidItem })
        raidItemsBySlot.set(key, existing)
    }

    // For each catalyst item, look up matching raid items by slot key
    for (const catalystItem of catalystItems) {
        const rawCatalystItem = rawItemLookup.get(catalystItem.id)
        if (rawCatalystItem?.inventoryType === undefined) {
            continue
        }

        const key = slotKey(rawCatalystItem.inventoryType, rawCatalystItem.itemSubClass)
        const matchingRaidItems = raidItemsBySlot.get(key) ?? []

        for (const { item: raidItem } of matchingRaidItems) {
            mappings.push({
                itemId: raidItem.id,
                encounterId: raidItem.bossId,
                catalyzedItemId: catalystItem.id,
            })
        }
    }

    logger.info("ItemEnrichment", `Built ${s(mappings.length)} catalyst mappings`)
    return mappings
}

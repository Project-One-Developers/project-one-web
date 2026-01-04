/**
 * Item enrichment module
 * Transforms Raidbots API items into our database format
 * Ported from Python raid-items script (enrichment.py)
 */
import "server-only"
import { match, P } from "ts-pattern"
import { logger } from "@/lib/logger"
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
import {
    wowItemSlotKeySchema,
    type WowArmorType,
    type WowItemSlotKey,
} from "@/shared/models/wow.models"
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

/**
 * Get slot subclass override based on inventory type
 * Uses ts-pattern for cleaner pattern matching
 */
function getSlotSubclassOverride(inventoryType: number): string | null | undefined {
    return match(inventoryType)
        .with(INVENTORY_TYPE_IDS.NECK, () => "" as const)
        .with(INVENTORY_TYPE_IDS.BACK, () => "" as const)
        .with(INVENTORY_TYPE_IDS.FINGER, () => "" as const)
        .with(INVENTORY_TYPE_IDS.TRINKET, () => "Trinket" as const)
        .otherwise(() => undefined) // undefined means no override
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
    const map = new Map<number, EncounterContext>()

    for (const instance of instances) {
        if (!instance.encounters) {
            continue
        }

        for (const encounter of instance.encounters) {
            map.set(encounter.id, { encounter, instance })
        }
    }

    return map
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
        let { itemSubclass } = classification
        const { armorType, isToken } = classification

        // Determine slot key from inventory type
        let slotKey: WowItemSlotKey | null = null

        const inventoryInfo = INVENTORY_TYPE_MAP[rawItem.inventoryType]
        if (inventoryInfo) {
            slotKey = inventoryInfo.slotKey

            // Apply slot-specific subclass overrides (Neck, Back, Finger -> "", Trinket -> "Trinket")
            const subclassOverride = getSlotSubclassOverride(rawItem.inventoryType)
            if (subclassOverride !== undefined) {
                itemSubclass = subclassOverride
            }
        }

        // For reagent tokens, force slot to Omni
        if (rawItem.itemClass === ITEM_CLASSES.REAGENT && rawItem.itemSubClass === 2) {
            slotKey = "omni"
        }

        // Determine if it's a tierset piece
        const isTierset = Boolean(
            rawItem.itemSetId && rawItem.allowableClasses?.length === 1
        )

        // Determine item levels
        const isVeryRare = rawItem.sources.some((src) => src.veryRare)
        const bossOrder = encounter.order ?? 0
        const isBoeOrCatalyst = bossOrder === 99 || instance.type === "catalyst"

        let ilvlNormal = rawItem.itemLevel
        let ilvlHeroic = rawItem.itemLevel
        let ilvlMythic = rawItem.itemLevel

        if (instance.type === "raid") {
            const levels = getItemLevelsForBoss(
                instance.id,
                bossOrder,
                isVeryRare,
                isBoeOrCatalyst
            )
            if (levels) {
                ilvlNormal = levels.normal
                ilvlHeroic = levels.heroic
                ilvlMythic = levels.mythic
            }
        }

        // Determine season
        const season = determineItemSeason(instance.id, encounter.id, defaultSeason)

        // Expand specs to classes
        const specIds = rawItem.specs ?? wowheadData?.specs ?? []
        const { classNames } = expandSpecsToClasses(specIds)

        // Determine if catalyzed item
        const isCatalyzed = instance.type === "catalyst"

        return {
            id: rawItem.id,
            name: rawItem.name,
            ilvlBase: rawItem.itemLevel,
            ilvlNormal,
            ilvlHeroic,
            ilvlMythic,
            slotKey: slotKey ?? wowItemSlotKeySchema.enum.omni, // Default to omni if no slot key
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
        if (!rawRaidItem) {
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
        if (!rawCatalystItem) {
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

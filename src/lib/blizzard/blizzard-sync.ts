import type { CharacterBlizzardInsert } from "@/db/repositories/blizzard"
import { bossRepo } from "@/db/repositories/bosses"
import { itemRepo } from "@/db/repositories/items"
import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"
import { getUnixTimestamp } from "@/shared/libs/date/date-utils"
import { evalRealSeason, parseItemTrack } from "@/shared/libs/items/item-bonus-utils"
import type { Boss } from "@/shared/models/boss.model"
import type { GearItem, Item } from "@/shared/models/item.model"
import type {
    WowItemEquippedSlotKey,
    WowItemSlotKey,
    WowRaidDifficulty,
} from "@/shared/models/wow.model"
import {
    fetchCharacterProfile,
    fetchCharacterEquipment,
    fetchCharacterEncountersRaids,
    fetchJournalInstance,
    fetchItem,
    fetchItemMedia,
    BLIZZARD_SLOT_MAP,
    BLIZZARD_DIFFICULTY_MAP,
    type CharacterProfileResponse,
    type EquipmentResponse,
    type EncountersRaidsResponse,
    type EquipmentSlot,
} from "./blizzard-api"

// ============================================================================
// Types
// ============================================================================

export type CharacterEncounterInsert = {
    characterId: string
    bossId: number
    difficulty: WowRaidDifficulty
    itemLevel: number
    numKills: number
    firstDefeated: Date | null
    lastDefeated: Date | null
}

export type ParsedBlizzardData = {
    character: CharacterBlizzardInsert
    encounters: CharacterEncounterInsert[]
}

// ============================================================================
// Main Functions
// ============================================================================

let itemsInDb: Item[] | null = null

// Track instances we've already fetched from Journal API during this sync
// Using a Map of Promises to handle concurrent requests properly
const fetchingInstances = new Map<number, Promise<void>>()

// Cache for items fetched from Blizzard API during this sync
// Maps itemId -> Promise<GearItem partial data or null>
type FetchedItemData = {
    name: string
    armorType: "Cloth" | "Leather" | "Mail" | "Plate" | null
    slotKey: WowItemSlotKey | null
    boe: boolean
    iconName: string
} | null

const fetchingItems = new Map<number, Promise<FetchedItemData>>()

/**
 * Reset the fetched instances and items cache (call at start of full sync)
 */
export function resetFetchedInstancesCache(): void {
    fetchingInstances.clear()
    fetchingItems.clear()
}

/**
 * Convert a name to a slug (lowercase, spaces to hyphens, remove special chars)
 */
function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/['']/g, "") // Remove apostrophes
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, "") // Trim leading/trailing hyphens
}

/**
 * Fetch and create bosses for a raid instance from Blizzard Journal API.
 * Uses a Promise cache to handle concurrent requests - multiple characters
 * encountering the same unknown instance will wait for the same fetch.
 */
async function fetchAndCreateBossesForInstance(
    instanceId: number,
    instanceName: string,
    bossLookup: Record<number, Boss>
): Promise<void> {
    // Check if already fetching/fetched - if so, wait for that Promise
    const existingFetch = fetchingInstances.get(instanceId)
    if (existingFetch) {
        await existingFetch
        return
    }

    // Create the fetch Promise and store it immediately (before any await)
    const fetchPromise = doFetchAndCreateBosses(instanceId, instanceName, bossLookup)
    fetchingInstances.set(instanceId, fetchPromise)

    await fetchPromise
}

/**
 * Internal function that does the actual fetch and boss creation
 */
async function doFetchAndCreateBosses(
    instanceId: number,
    instanceName: string,
    bossLookup: Record<number, Boss>
): Promise<void> {
    const journalData = await fetchJournalInstance(instanceId)
    if (!journalData?.encounters || journalData.category.type !== "RAID") {
        logger.debug(
            "Blizzard",
            `Skipping non-raid or invalid instance: ${s(instanceId)} (${instanceName})`
        )
        return
    }

    const raidSlug = slugify(journalData.name)
    const newBosses: Boss[] = journalData.encounters.map((enc, index) => ({
        id: enc.id, // Use Blizzard encounter ID as our boss ID
        name: enc.name,
        instanceId: journalData.id,
        instanceName: journalData.name,
        instanceType: "raid",
        order: index + 1,
        raidSlug: raidSlug,
        encounterSlug: slugify(enc.name),
        blizzardEncounterId: enc.id,
    }))

    if (newBosses.length > 0) {
        logger.info(
            "Blizzard",
            `Auto-creating ${s(newBosses.length)} bosses for ${journalData.name} from Journal API`
        )
        await bossRepo.upsert(newBosses)

        // Add to lookup for immediate use
        for (const boss of newBosses) {
            if (boss.blizzardEncounterId) {
                bossLookup[boss.blizzardEncounterId] = boss
            }
        }
    }
}

/**
 * Fetch and parse character data from Blizzard API
 */
export async function fetchAndParseCharacter(
    characterId: string, // FK to charTable.id
    name: string,
    realm: string,
    bossLookup: Record<number, Boss> // blizzardEncounterId -> boss
): Promise<ParsedBlizzardData | null> {
    // Fetch all data in parallel
    const [profile, equipment, raids] = await Promise.all([
        fetchCharacterProfile(name, realm),
        fetchCharacterEquipment(name, realm),
        fetchCharacterEncountersRaids(name, realm),
    ])

    if (!profile) {
        logger.warn("Blizzard", `Could not fetch profile for ${name}-${realm}`)
        return null
    }

    // Load items from DB if not cached
    itemsInDb ??= await itemRepo.getAll()

    const character = await parseCharacterData(characterId, profile, equipment)
    const encounters = await parseEncounterData(characterId, raids, bossLookup)

    return { character, encounters }
}

/**
 * Parse character profile and equipment into our data model
 */
async function parseCharacterData(
    characterId: string,
    profile: CharacterProfileResponse,
    equipment: EquipmentResponse | null
): Promise<CharacterBlizzardInsert> {
    return {
        characterId,
        race: profile.race.name,
        blizzardCharacterId: profile.id,
        syncedAt: getUnixTimestamp(),
        lastLoginAt: Math.floor(profile.last_login_timestamp / 1000), // Convert ms to seconds
        averageItemLevel: profile.average_item_level,
        equippedItemLevel: profile.equipped_item_level,
        itemsEquipped: equipment
            ? await mapEquipmentToGearItems(equipment.equipped_items)
            : [],
    }
}

/**
 * Parse raid encounters into our normalized format
 * Auto-creates bosses from Journal API if instance is unknown
 */
async function parseEncounterData(
    characterId: string,
    raids: EncountersRaidsResponse | null,
    bossLookup: Record<number, Boss>
): Promise<CharacterEncounterInsert[]> {
    if (!raids?.expansions) {
        return []
    }

    const encounters: CharacterEncounterInsert[] = []

    for (const expansion of raids.expansions) {
        for (const instance of expansion.instances) {
            // Check if we need to fetch bosses for this instance
            const firstEncounter = instance.modes[0]?.progress.encounters?.[0]
            if (firstEncounter && !bossLookup[firstEncounter.encounter.id]) {
                // Unknown instance - try to auto-populate from Journal API
                await fetchAndCreateBossesForInstance(
                    instance.instance.id,
                    instance.instance.name,
                    bossLookup
                )
            }

            for (const mode of instance.modes) {
                const difficulty = mapBlizzardDifficulty(mode.difficulty.type)
                if (!difficulty) {
                    continue
                }

                const modeEncounters = mode.progress.encounters
                if (!modeEncounters) {
                    continue
                }

                for (const enc of modeEncounters) {
                    const boss = bossLookup[enc.encounter.id]
                    if (!boss) {
                        // Still unknown after attempting Journal fetch - skip
                        logger.debug(
                            "Blizzard",
                            `Skipping encounter with unknown Blizzard ID: ${s(enc.encounter.id)} (${enc.encounter.name})`
                        )
                        continue
                    }

                    encounters.push({
                        characterId,
                        bossId: boss.id,
                        difficulty,
                        itemLevel: 0, // Blizzard API doesn't provide item level at kill
                        numKills: enc.completed_count,
                        firstDefeated: null, // Blizzard API doesn't provide first kill date
                        lastDefeated: enc.last_kill_timestamp
                            ? new Date(enc.last_kill_timestamp)
                            : null,
                    })
                }
            }
        }
    }

    return encounters
}

/**
 * Map Blizzard equipment to our GearItem format
 */
async function mapEquipmentToGearItems(
    equippedItems: EquipmentSlot[]
): Promise<GearItem[]> {
    const res: GearItem[] = []

    for (const slot of equippedItems) {
        const slotKey = mapBlizzardSlot(slot.slot.type)
        if (!slotKey) {
            // Skip non-gear slots like SHIRT, TABARD
            continue
        }

        const gearPiece = await createGearPiece(
            slot.item.id,
            slot.level.value,
            slot.bonus_list,
            extractGemIds(slot.sockets),
            extractEnchantIds(slot.enchantments),
            slotKey
        )

        if (gearPiece) {
            res.push(gearPiece)
        }
    }

    return res
}

/**
 * Create a GearItem from Blizzard equipment data.
 * If item is not in our DB, fetches details from Blizzard API.
 */
async function createGearPiece(
    itemId: number,
    ilvl: number,
    bonusIds: number[] | undefined,
    gemIds: number[] | null,
    enchantIds: number[] | null,
    equippedInSlot: WowItemEquippedSlotKey
): Promise<GearItem | null> {
    if (!itemsInDb) {
        return null
    }

    const wowItem = itemsInDb.find((i) => i.id === itemId)
    if (wowItem) {
        // Item exists in our DB - use the rich data
        return {
            item: {
                id: wowItem.id,
                name: wowItem.name,
                armorType: wowItem.armorType,
                slotKey: wowItem.slotKey,
                token: wowItem.token,
                tierset: wowItem.tierset,
                boe: wowItem.boe,
                veryRare: wowItem.veryRare,
                iconName: wowItem.iconName,
                season: evalRealSeason(wowItem, ilvl),
                specIds: wowItem.specIds,
            },
            source: "equipped",
            equippedInSlot,
            itemLevel: ilvl,
            bonusIds: bonusIds ?? null,
            itemTrack: bonusIds ? parseItemTrack(bonusIds) : null,
            gemIds,
            enchantIds,
        }
    }

    // Item not in DB - fetch from Blizzard API (with caching)
    const fetchedData = await fetchItemDataCached(itemId)

    if (!fetchedData) {
        return null
    }

    // Parse item track from bonus IDs - this gives us season info for M+ gear
    const itemTrack = bonusIds ? parseItemTrack(bonusIds) : null

    return {
        item: {
            id: itemId,
            name: fetchedData.name,
            armorType: fetchedData.armorType,
            slotKey: fetchedData.slotKey ?? equippedSlotToGenericSlot(equippedInSlot),
            token: false,
            tierset: false,
            boe: fetchedData.boe,
            veryRare: false,
            iconName: fetchedData.iconName,
            season: itemTrack?.season ?? 0,
            specIds: null,
        },
        source: "equipped",
        equippedInSlot,
        itemLevel: ilvl,
        bonusIds: bonusIds ?? null,
        itemTrack,
        gemIds,
        enchantIds,
    }
}

/**
 * Fetch item data from Blizzard API with caching to avoid repeated calls.
 * Uses Promise cache to handle concurrent requests for the same item.
 */
async function fetchItemDataCached(itemId: number): Promise<FetchedItemData> {
    // Check if already fetching/fetched - if so, wait for that Promise
    const existingFetch = fetchingItems.get(itemId)
    if (existingFetch) {
        return existingFetch
    }

    // Create the fetch Promise and store it immediately (before any await)
    const fetchPromise = doFetchItemData(itemId)
    fetchingItems.set(itemId, fetchPromise)

    return fetchPromise
}

/**
 * Internal function that does the actual item fetch from Blizzard API
 */
async function doFetchItemData(itemId: number): Promise<FetchedItemData> {
    logger.debug(
        "Blizzard",
        `createGearPiece: fetching missing item ${s(itemId)} from Blizzard API`
    )

    const [blizzItem, iconUrl] = await Promise.all([
        fetchItem(itemId),
        fetchItemMedia(itemId),
    ])

    if (!blizzItem) {
        logger.warn(
            "Blizzard",
            `createGearPiece: could not fetch item ${s(itemId)} from Blizzard API`
        )
        return null
    }

    return {
        name: blizzItem.name,
        armorType: mapBlizzardSubclassToArmorType(
            blizzItem.item_class.name,
            blizzItem.item_subclass.name
        ),
        slotKey: mapBlizzardInventoryTypeToSlotKey(blizzItem.inventory_type.type),
        boe: blizzItem.binding?.type === "ON_EQUIP",
        iconName: iconUrl ? extractIconNameFromUrl(iconUrl) : "inv_misc_questionmark",
    }
}

/**
 * Convert specific equipped slot to generic item slot
 * e.g., finger1/finger2 -> finger, trinket1/trinket2 -> trinket
 */
function equippedSlotToGenericSlot(equippedSlot: WowItemEquippedSlotKey): WowItemSlotKey {
    const mapping: Record<WowItemEquippedSlotKey, WowItemSlotKey> = {
        head: "head",
        neck: "neck",
        shoulder: "shoulder",
        back: "back",
        chest: "chest",
        shirt: "chest", // fallback
        tabard: "chest", // fallback
        wrist: "wrist",
        hands: "hands",
        waist: "waist",
        legs: "legs",
        feet: "feet",
        finger1: "finger",
        finger2: "finger",
        trinket1: "trinket",
        trinket2: "trinket",
        main_hand: "main_hand",
        off_hand: "off_hand",
    }
    return mapping[equippedSlot]
}

/**
 * Extract icon name from Blizzard media URL
 * e.g., "https://render.worldofwarcraft.com/eu/icons/56/inv_boots_cloth_01.jpg" -> "inv_boots_cloth_01"
 */
function extractIconNameFromUrl(url: string): string {
    const match = /\/([^/]+)\.(jpg|png)$/i.exec(url)
    return match?.[1] ?? "inv_misc_questionmark"
}

/**
 * Map Blizzard inventory_type to our internal item slot key (generic, not equipped)
 * This returns the generic slot type (finger, trinket) not specific equipped slots (finger1, finger2)
 */
function mapBlizzardInventoryTypeToSlotKey(inventoryType: string): WowItemSlotKey | null {
    const mapping: Record<string, WowItemSlotKey> = {
        HEAD: "head",
        NECK: "neck",
        SHOULDER: "shoulder",
        CLOAK: "back",
        CHEST: "chest",
        ROBE: "chest",
        WRIST: "wrist",
        HAND: "hands",
        HANDS: "hands",
        WAIST: "waist",
        LEGS: "legs",
        FEET: "feet",
        FINGER: "finger",
        TRINKET: "trinket",
        WEAPON: "main_hand",
        TWOHWEAPON: "main_hand",
        RANGED: "main_hand",
        RANGEDRIGHT: "main_hand",
        SHIELD: "off_hand",
        HOLDABLE: "off_hand",
        WEAPONOFFHAND: "off_hand",
    }
    return mapping[inventoryType] ?? null
}

/**
 * Map Blizzard item class/subclass to our armor type
 */
function mapBlizzardSubclassToArmorType(
    itemClass: string,
    itemSubclass: string
): "Cloth" | "Leather" | "Mail" | "Plate" | null {
    if (itemClass !== "Armor") {
        return null
    }

    const mapping: Record<string, "Cloth" | "Leather" | "Mail" | "Plate"> = {
        Cloth: "Cloth",
        Leather: "Leather",
        Mail: "Mail",
        Plate: "Plate",
    }
    return mapping[itemSubclass] ?? null
}

// ============================================================================
// Mapping Helpers
// ============================================================================

/**
 * Map Blizzard slot type to our internal slot key
 */
function mapBlizzardSlot(blizzardSlot: string): WowItemEquippedSlotKey | null {
    const mapped = BLIZZARD_SLOT_MAP[blizzardSlot]
    if (!mapped || mapped === "shirt" || mapped === "tabard") {
        return null
    }
    return mapped
}

/**
 * Map Blizzard difficulty type to our internal difficulty
 */
function mapBlizzardDifficulty(blizzardDifficulty: string): WowRaidDifficulty | null {
    const mapped = BLIZZARD_DIFFICULTY_MAP[blizzardDifficulty]
    if (!mapped) {
        return null
    }
    return mapped
}

/**
 * Extract gem IDs from socket data
 */
function extractGemIds(
    sockets: { socket_type: { type: string }; item?: { id: number } }[] | undefined
): number[] | null {
    if (!sockets || sockets.length === 0) {
        return null
    }

    const gems = sockets
        .map((s) => s.item?.id)
        .filter((id): id is number => id !== undefined)

    return gems.length > 0 ? gems : null
}

/**
 * Extract enchant IDs from enchantment data
 */
function extractEnchantIds(
    enchantments: { enchantment_id: number; display_string?: string }[] | undefined
): number[] | null {
    if (!enchantments || enchantments.length === 0) {
        return null
    }

    const enchants = enchantments.map((e) => e.enchantment_id)
    return enchants.length > 0 ? enchants : null
}

/**
 * Reset items cache (useful for testing or forced refresh)
 */
export function resetItemsCache(): void {
    itemsInDb = null
}

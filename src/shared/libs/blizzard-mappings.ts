import { match } from "ts-pattern"
import type {
    WowClassName,
    WowItemEquippedSlotKey,
    WowItemSlotKey,
    WowRaidDifficulty,
} from "@/shared/models/wow.models"

// ============================================================================
// Blizzard API Constants
// ============================================================================

/**
 * Map Blizzard API slot types to our internal slot keys
 */
export const BLIZZARD_SLOT_MAP: Record<
    string,
    WowItemEquippedSlotKey | "shirt" | "tabard"
> = {
    HEAD: "head",
    NECK: "neck",
    SHOULDER: "shoulder",
    BACK: "back",
    CHEST: "chest",
    WRIST: "wrist",
    HANDS: "hands",
    WAIST: "waist",
    LEGS: "legs",
    FEET: "feet",
    FINGER_1: "finger1",
    FINGER_2: "finger2",
    TRINKET_1: "trinket1",
    TRINKET_2: "trinket2",
    MAIN_HAND: "main_hand",
    OFF_HAND: "off_hand",
    SHIRT: "shirt",
    TABARD: "tabard",
}

/**
 * Map Blizzard difficulty types to our internal difficulty names
 */
export const BLIZZARD_DIFFICULTY_MAP: Record<string, WowRaidDifficulty> = {
    NORMAL: "Normal",
    HEROIC: "Heroic",
    MYTHIC: "Mythic",
    LFR: "LFR",
}

// ============================================================================
// Mapping Functions
// ============================================================================

/**
 * Map Blizzard class ID to WoW class name
 */
export const mapBlizzardClassId = (classId: number): WowClassName | null =>
    match<number, WowClassName | null>(classId)
        .with(1, () => "Warrior")
        .with(2, () => "Paladin")
        .with(3, () => "Hunter")
        .with(4, () => "Rogue")
        .with(5, () => "Priest")
        .with(6, () => "Death Knight")
        .with(7, () => "Shaman")
        .with(8, () => "Mage")
        .with(9, () => "Warlock")
        .with(10, () => "Monk")
        .with(11, () => "Druid")
        .with(12, () => "Demon Hunter")
        .with(13, () => "Evoker")
        .otherwise(() => null)

/**
 * Map WoW class name to Blizzard class ID (inverse of mapBlizzardClassId)
 */
export const mapClassNameToId = (className: WowClassName): number =>
    match<WowClassName, number>(className)
        .with("Warrior", () => 1)
        .with("Paladin", () => 2)
        .with("Hunter", () => 3)
        .with("Rogue", () => 4)
        .with("Priest", () => 5)
        .with("Death Knight", () => 6)
        .with("Shaman", () => 7)
        .with("Mage", () => 8)
        .with("Warlock", () => 9)
        .with("Monk", () => 10)
        .with("Druid", () => 11)
        .with("Demon Hunter", () => 12)
        .with("Evoker", () => 13)
        .exhaustive()

/**
 * Map Blizzard slot type to our internal equipped slot key
 * Returns null for non-gear slots (shirt, tabard)
 */
export function mapBlizzardSlot(blizzardSlot: string): WowItemEquippedSlotKey | null {
    const mapped = BLIZZARD_SLOT_MAP[blizzardSlot]
    if (!mapped || mapped === "shirt" || mapped === "tabard") {
        return null
    }
    return mapped
}

/**
 * Map Blizzard difficulty type to our internal difficulty
 */
export function mapBlizzardDifficulty(
    blizzardDifficulty: string
): WowRaidDifficulty | null {
    const mapped = BLIZZARD_DIFFICULTY_MAP[blizzardDifficulty]
    if (!mapped) {
        return null
    }
    return mapped
}

/**
 * Map Blizzard inventory_type to our internal item slot key (generic, not equipped)
 * This returns the generic slot type (finger, trinket) not specific equipped slots (finger1, finger2)
 */
export function mapBlizzardInventoryTypeToSlotKey(
    inventoryType: string
): WowItemSlotKey | null {
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
export function mapBlizzardSubclassToArmorType(
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

/**
 * Parse WoW difficulty ID (from addon exports) to raid difficulty
 * Used by loot parsers (MRT, RC Loot Council)
 */
export const parseWowDifficultyId = (wowDiff: number): WowRaidDifficulty =>
    match(wowDiff)
        .returnType<WowRaidDifficulty>()
        .with(14, () => "Normal")
        .with(15, () => "Heroic")
        .with(16, () => "Mythic")
        .otherwise(() => "Mythic")

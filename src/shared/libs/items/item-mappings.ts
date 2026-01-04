/**
 * Item mappings ported from Python raid-items script (enrichment.py)
 * Used for transforming Raidbots API data to our database format
 */
import type {
    WowArmorType,
    WowItemSlot,
    WowItemSlotKey,
} from "@/shared/models/wow.models"

// ============================================================================
// Item Class Constants (for readable code instead of magic numbers)
// ============================================================================

/** Raidbots/WoW item class IDs */
export const ITEM_CLASSES = {
    CONSUMABLE: 0,
    CONTAINER: 1,
    WEAPON: 2,
    GEM: 3,
    ARMOR: 4,
    REAGENT: 5,
    PROJECTILE: 6,
    TRADEGOODS: 7,
    ITEM_ENHANCEMENT: 8,
    RECIPE: 9,
    QUESTITEM: 12,
    KEY: 13,
    MISCELLANEOUS: 15,
    GLYPH: 16,
    BATTLEPET: 17,
    WOW_TOKEN: 18,
    PROFESSION: 19,
} as const

/** Raidbots/WoW inventory type IDs */
export const INVENTORY_TYPE_IDS = {
    NON_EQUIPPABLE: 0,
    HEAD: 1,
    NECK: 2,
    SHOULDER: 3,
    SHIRT: 4,
    CHEST: 5,
    WAIST: 6,
    LEGS: 7,
    FEET: 8,
    WRIST: 9,
    HANDS: 10,
    FINGER: 11,
    TRINKET: 12,
    MAIN_HAND: 13,
    OFF_HAND: 14,
    RANGED: 15,
    BACK: 16,
    TWO_HAND: 17,
    BAG: 18,
    TABARD: 19,
    ROBE: 20,
} as const

// ============================================================================
// Spec ID → Class info mapping
// ============================================================================

export type SpecInfo = {
    classId: number
    className: string
    specName: string
}

export const SPEC_MAP: Record<number, SpecInfo> = {
    // Death Knight
    250: { classId: 6, className: "Death Knight", specName: "Blood Death Knight" },
    251: { classId: 6, className: "Death Knight", specName: "Frost Death Knight" },
    252: { classId: 6, className: "Death Knight", specName: "Unholy Death Knight" },
    // Demon Hunter
    577: { classId: 12, className: "Demon Hunter", specName: "Havoc Demon Hunter" },
    581: { classId: 12, className: "Demon Hunter", specName: "Vengeance Demon Hunter" },
    1480: { classId: 12, className: "Demon Hunter", specName: "Devourer Demon Hunter" },
    // Druid
    102: { classId: 11, className: "Druid", specName: "Balance Druid" },
    103: { classId: 11, className: "Druid", specName: "Feral Druid" },
    104: { classId: 11, className: "Druid", specName: "Guardian Druid" },
    105: { classId: 11, className: "Druid", specName: "Restoration Druid" },
    // Evoker
    1467: { classId: 13, className: "Evoker", specName: "Devastation Evoker" },
    1468: { classId: 13, className: "Evoker", specName: "Preservation Evoker" },
    1473: { classId: 13, className: "Evoker", specName: "Augmentation Evoker" },
    // Hunter
    253: { classId: 3, className: "Hunter", specName: "Beast Mastery Hunter" },
    254: { classId: 3, className: "Hunter", specName: "Marksmanship Hunter" },
    255: { classId: 3, className: "Hunter", specName: "Survival Hunter" },
    // Mage
    62: { classId: 8, className: "Mage", specName: "Arcane Mage" },
    63: { classId: 8, className: "Mage", specName: "Fire Mage" },
    64: { classId: 8, className: "Mage", specName: "Frost Mage" },
    // Monk
    268: { classId: 10, className: "Monk", specName: "Brewmaster Monk" },
    270: { classId: 10, className: "Monk", specName: "Mistweaver Monk" },
    269: { classId: 10, className: "Monk", specName: "Windwalker Monk" },
    // Paladin
    65: { classId: 2, className: "Paladin", specName: "Holy Paladin" },
    66: { classId: 2, className: "Paladin", specName: "Protection Paladin" },
    70: { classId: 2, className: "Paladin", specName: "Retribution Paladin" },
    // Priest
    256: { classId: 5, className: "Priest", specName: "Discipline Priest" },
    257: { classId: 5, className: "Priest", specName: "Holy Priest" },
    258: { classId: 5, className: "Priest", specName: "Shadow Priest" },
    // Rogue
    259: { classId: 4, className: "Rogue", specName: "Assassination Rogue" },
    260: { classId: 4, className: "Rogue", specName: "Outlaw Rogue" },
    261: { classId: 4, className: "Rogue", specName: "Subtlety Rogue" },
    // Shaman
    262: { classId: 7, className: "Shaman", specName: "Elemental Shaman" },
    263: { classId: 7, className: "Shaman", specName: "Enhancement Shaman" },
    264: { classId: 7, className: "Shaman", specName: "Restoration Shaman" },
    // Warlock
    265: { classId: 9, className: "Warlock", specName: "Affliction Warlock" },
    266: { classId: 9, className: "Warlock", specName: "Demonology Warlock" },
    267: { classId: 9, className: "Warlock", specName: "Destruction Warlock" },
    // Warrior
    71: { classId: 1, className: "Warrior", specName: "Arms Warrior" },
    72: { classId: 1, className: "Warrior", specName: "Fury Warrior" },
    73: { classId: 1, className: "Warrior", specName: "Protection Warrior" },
}

// Item class mapping (itemClass number → string)
export const ITEM_CLASS_MAP: Record<number, string> = {
    0: "Consumable",
    1: "Container",
    2: "Weapon",
    3: "Gem",
    4: "Armor",
    5: "Reagent",
    6: "Projectile",
    7: "Tradegoods",
    8: "ItemEnhancement",
    9: "Recipe",
    10: "CurrencyTokenObsolete",
    11: "Quiver",
    12: "Questitem",
    13: "Key",
    14: "PermanentObsolete",
    15: "Miscellaneous",
    16: "Glyph",
    17: "Battlepet",
    18: "WoWToken",
    19: "Profession",
}

// Armor subclass mapping
export type ArmorTypeInfo = {
    subclass: string
    armorType: WowArmorType | null
}

export const ARMOR_TYPE_MAP: Record<number, ArmorTypeInfo> = {
    0: { subclass: "Miscellaneous", armorType: null },
    1: { subclass: "Cloth", armorType: "Cloth" },
    2: { subclass: "Leather", armorType: "Leather" },
    3: { subclass: "Mail", armorType: "Mail" },
    4: { subclass: "Plate", armorType: "Plate" },
    5: { subclass: "Cosmetic", armorType: null },
    6: { subclass: "Shield", armorType: null },
    7: { subclass: "Libram", armorType: null },
    8: { subclass: "Idol", armorType: null },
    9: { subclass: "Totem", armorType: null },
    10: { subclass: "Sigil", armorType: null },
    11: { subclass: "Relic", armorType: null },
}

// Weapon subclass mapping
export const WEAPON_TYPE_MAP: Record<number, string> = {
    0: "One-Handed Axes",
    1: "Two-Handed Axes",
    2: "Bows",
    3: "Guns",
    4: "One-Handed Maces",
    5: "Two-Handed Maces",
    6: "Polearms",
    7: "One-Handed Swords",
    8: "Two-Handed Swords",
    9: "Warglaives",
    10: "Staves",
    11: "Bear Claws",
    12: "CatClaws",
    13: "Fist Weapons",
    14: "Miscellaneous",
    15: "Daggers",
    16: "Thrown",
    17: "Spears",
    18: "Crossbows",
    19: "Wands",
}

// Inventory type mapping
export type InventoryTypeInfo = {
    slot: WowItemSlot
    slotKey: WowItemSlotKey | null
}

export const INVENTORY_TYPE_MAP: Record<number, InventoryTypeInfo> = {
    0: { slot: "Omni", slotKey: null }, // Non-equippable
    1: { slot: "Head", slotKey: "head" },
    2: { slot: "Neck", slotKey: "neck" },
    3: { slot: "Shoulder", slotKey: "shoulder" },
    4: { slot: "Omni", slotKey: null }, // Shirt
    5: { slot: "Chest", slotKey: "chest" },
    6: { slot: "Waist", slotKey: "waist" },
    7: { slot: "Legs", slotKey: "legs" },
    8: { slot: "Feet", slotKey: "feet" },
    9: { slot: "Wrist", slotKey: "wrist" },
    10: { slot: "Hands", slotKey: "hands" },
    11: { slot: "Finger", slotKey: "finger" },
    12: { slot: "Trinket", slotKey: "trinket" },
    13: { slot: "Main Hand", slotKey: "main_hand" },
    14: { slot: "Off Hand", slotKey: "off_hand" },
    15: { slot: "Ranged", slotKey: "main_hand" },
    16: { slot: "Back", slotKey: "back" },
    17: { slot: "Two Hand", slotKey: "main_hand" },
    18: { slot: "Omni", slotKey: null }, // Bag
    19: { slot: "Omni", slotKey: null }, // Tabard
    20: { slot: "Chest", slotKey: "chest" }, // Robe
    21: { slot: "Main Hand", slotKey: "main_hand" },
    22: { slot: "Off Hand", slotKey: "off_hand" },
    23: { slot: "Off Hand", slotKey: "off_hand" }, // Held in off-hand
    24: { slot: "Omni", slotKey: null }, // Ammo
    25: { slot: "Omni", slotKey: null }, // Thrown
    26: { slot: "Ranged", slotKey: "main_hand" },
    27: { slot: "Omni", slotKey: null }, // Quiver
    28: { slot: "Omni", slotKey: null }, // Relic
}

// Helper function to expand specs to class info
export function expandSpecsToClasses(specIds: number[]): {
    classIds: number[]
    classNames: string[]
    specNames: string[]
} {
    const classIds = new Set<number>()
    const classNames = new Set<string>()
    const specNames: string[] = []

    for (const specId of specIds) {
        const specInfo = SPEC_MAP[specId]
        if (specInfo) {
            classIds.add(specInfo.classId)
            classNames.add(specInfo.className)
            specNames.push(specInfo.specName)
        }
    }

    return {
        classIds: [...classIds].sort((a, b) => a - b),
        classNames: [...classNames].sort(),
        specNames: specNames.sort(),
    }
}

// Helper function to parse stats from Wowhead format
export function parseStats(wowheadStats: string[]): {
    stats: string
    mainStats: string
    secondaryStats: string
} {
    const mainStatsList: string[] = []
    const secondaryStatsList: string[] = []

    const statsDesc = wowheadStats.join(",")

    // Main stats
    if (statsDesc.includes("Agility")) {
        mainStatsList.push("AGI")
    }
    if (statsDesc.includes("Strength")) {
        mainStatsList.push("STR")
    }
    if (statsDesc.includes("Intellect")) {
        mainStatsList.push("INT")
    }

    // Secondary stats
    for (const stat of wowheadStats) {
        if (stat.includes("Mastery")) {
            secondaryStatsList.push("MAS")
        }
        if (stat.includes("Haste")) {
            secondaryStatsList.push("HASTE")
        }
        if (stat.includes("Critical")) {
            secondaryStatsList.push("CRIT")
        }
        if (stat.includes("Versatility")) {
            secondaryStatsList.push("VERS")
        }
    }

    return {
        stats: wowheadStats.join(","),
        mainStats: mainStatsList.join("/"),
        secondaryStats: secondaryStatsList.join("/"),
    }
}

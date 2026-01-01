import { match } from "ts-pattern"
import {
    wowItemEquippedSlotKeySchema,
    wowItemSlotKeySchema,
    type WowItemEquippedSlotKey,
    type WowItemSlotKey,
} from "@/shared/models/wow.models"

export const equippedSlotToSlot = (equipped: WowItemEquippedSlotKey): WowItemSlotKey => {
    return wowItemSlotKeySchema.parse(equipped.replaceAll("1", "").replaceAll("2", ""))
}

export const slotToEquippedSlot = (slotKey: WowItemSlotKey): WowItemEquippedSlotKey => {
    if (slotKey === "finger") {
        return wowItemEquippedSlotKeySchema.parse("finger1")
    }
    if (slotKey === "trinket") {
        return wowItemEquippedSlotKeySchema.parse("trinket1")
    }
    return wowItemEquippedSlotKeySchema.parse(slotKey)
}

export const formatWowSlotKey = (slot: WowItemSlotKey): string =>
    match(slot)
        .with("head", () => "Head")
        .with("neck", () => "Neck")
        .with("shoulder", () => "Shoulder")
        .with("back", () => "Back")
        .with("chest", () => "Chest")
        .with("wrist", () => "Wrist")
        .with("hands", () => "Hands")
        .with("waist", () => "Waist")
        .with("legs", () => "Legs")
        .with("feet", () => "Feet")
        .with("finger", () => "Finger")
        .with("trinket", () => "Trinket")
        .with("main_hand", () => "Main Hand")
        .with("off_hand", () => "Off Hand")
        .with("omni", () => "Omni")
        .exhaustive()

export const formatWowEquippedSlotKey = (slot: WowItemEquippedSlotKey): string =>
    match(slot)
        .with("finger1", () => "Finger")
        .with("finger2", () => "Finger")
        .with("trinket1", () => "Trinket")
        .with("trinket2", () => "Trinket")
        .with("shirt", () => "Shirt")
        .with("tabard", () => "Tabard")
        .otherwise((s) => formatWowSlotKey(s))

// ============================================================================
// Blizzard API Extraction Utilities
// ============================================================================

type BlizzardSocket = {
    socket_type: { type: string }
    item?: { id: number }
}

type BlizzardEnchantment = {
    enchantment_id: number
    display_string?: string
}

/**
 * Extract gem IDs from Blizzard API socket data
 */
export function extractGemIds(sockets: BlizzardSocket[] | undefined): number[] | null {
    if (!sockets || sockets.length === 0) {
        return null
    }

    const gems = sockets
        .map((s) => s.item?.id)
        .filter((id): id is number => id !== undefined)

    return gems.length > 0 ? gems : null
}

/**
 * Extract enchant IDs from Blizzard API enchantment data
 */
export function extractEnchantIds(
    enchantments: BlizzardEnchantment[] | undefined
): number[] | null {
    if (!enchantments || enchantments.length === 0) {
        return null
    }

    const enchants = enchantments.map((e) => e.enchantment_id)
    return enchants.length > 0 ? enchants : null
}

/**
 * Extract icon name from Blizzard media URL
 * e.g., "https://render.worldofwarcraft.com/eu/icons/56/inv_boots_cloth_01.jpg" -> "inv_boots_cloth_01"
 */
export function extractIconNameFromUrl(url: string): string {
    const match = /\/([^/]+)\.(jpg|png)$/i.exec(url)
    return match?.[1] ?? "inv_misc_questionmark"
}

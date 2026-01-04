import { match } from "ts-pattern"
import type {
    WowItemEquippedSlotKey,
    WowItemSlot,
    WowItemSlotKey,
} from "@/shared/models/wow.models"

export const equippedSlotToSlot = (equipped: WowItemEquippedSlotKey): WowItemSlotKey =>
    match(equipped)
        .returnType<WowItemSlotKey>()
        .with("finger1", "finger2", () => "finger")
        .with("trinket1", "trinket2", () => "trinket")
        .with("shirt", "tabard", () => {
            throw new Error(`Slot "${equipped}" has no base slot equivalent`)
        })
        .otherwise((slot) => slot)

export const slotToEquippedSlot = (slotKey: WowItemSlotKey): WowItemEquippedSlotKey =>
    match(slotKey)
        .returnType<WowItemEquippedSlotKey>()
        .with("finger", () => "finger1")
        .with("trinket", () => "trinket1")
        .with("omni", () => {
            throw new Error(`Slot "omni" has no equipped slot equivalent`)
        })
        .otherwise((slot) => slot)

// Maps slot key to display name (subset of WowItemSlot - excludes "Two Hand" and "Ranged")
export const formatWowSlotKey = (slot: WowItemSlotKey): WowItemSlot =>
    match(slot)
        .returnType<WowItemSlot>()
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

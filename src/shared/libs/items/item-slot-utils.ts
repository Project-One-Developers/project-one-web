import { match } from "ts-pattern"
import {
    wowItemEquippedSlotKeySchema,
    wowItemSlotKeySchema,
    type WowItemEquippedSlotKey,
    type WowItemSlotKey,
} from "@/shared/models/wow.model"

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

export function formatWowSlotKey(slot: WowItemSlotKey): string {
    return match(slot)
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
}

export function formatWowEquippedSlotKey(slot: WowItemEquippedSlotKey): string {
    return match(slot)
        .with("finger1", () => "Finger")
        .with("finger2", () => "Finger")
        .with("trinket1", () => "Trinket")
        .with("trinket2", () => "Trinket")
        .otherwise((s) => formatWowSlotKey(s))
}

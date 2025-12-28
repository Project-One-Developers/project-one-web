import { z } from "zod"

import {
    ARMOR_TYPES,
    CLASSES_NAME as CLASSES_NAME_VALUES,
    ITEM_EQUIPPED_SLOTS_KEY,
    ITEM_SLOTS_DESC,
    ITEM_SLOTS_KEY,
    RAID_DIFF,
    ROLES,
    SPECS_NAME,
} from "@/shared/consts/wow.consts"

export const wowClassNameSchema = z.enum(CLASSES_NAME_VALUES)
export type WowClassName = z.infer<typeof wowClassNameSchema>

export const wowClassTankSchema = z.enum([
    "Death Knight",
    "Paladin",
    "Warrior",
    "Druid",
    "Monk",
    "Demon Hunter",
])

export const wowClassHealerSchema = z.enum([
    "Paladin",
    "Shaman",
    "Druid",
    "Priest",
    "Monk",
    "Evoker",
])

export const wowItemSlotSchema = z.enum(ITEM_SLOTS_DESC)
export type WowItemSlot = z.infer<typeof wowItemSlotSchema>

export const wowItemSlotKeySchema = z.enum(ITEM_SLOTS_KEY)
export type WowItemSlotKey = z.infer<typeof wowItemSlotKeySchema>

export const wowItemEquippedSlotKeySchema = z.enum(ITEM_EQUIPPED_SLOTS_KEY)
export type WowItemEquippedSlotKey = z.infer<typeof wowItemEquippedSlotKeySchema>

export const wowItemSlotKeyTiersetSchema = z.enum([
    "head",
    "shoulder",
    "chest",
    "hands",
    "legs",
])
export type WowTiersetSlot = z.infer<typeof wowItemSlotKeyTiersetSchema>

export const wowArmorTypeSchema = z.enum(ARMOR_TYPES)
export type WowArmorType = z.infer<typeof wowArmorTypeSchema>

export const wowRolesSchema = z.enum(ROLES)
export type WoWRole = z.infer<typeof wowRolesSchema>

export const wowRolePositionSchema = z.enum(["Melee", "Ranged"])
export type WoWRolePosition = z.infer<typeof wowRolePositionSchema>

export const wowRaidDiffSchema = z.enum(RAID_DIFF)
export type WowRaidDifficulty = z.infer<typeof wowRaidDiffSchema>

export const wowItemTrackNameSchema = z.enum([
    "Explorer",
    "Adventurer",
    "Veteran",
    "Champion",
    "Hero",
    "Myth",
])
export type WowItemTrackName = z.infer<typeof wowItemTrackNameSchema>

export const tierSetBonusSchema = z.enum(["none", "2p", "4p"])
export type TierSetBonus = z.infer<typeof tierSetBonusSchema>

export const wowRoleClassSchema = z.object({
    Tank: wowClassTankSchema,
    Healer: wowClassHealerSchema,
    DPS: wowClassNameSchema,
})

export const wowSpecNameSchema = z.enum(SPECS_NAME)
export type WowSpecName = z.infer<typeof wowSpecNameSchema>

export const ROLES_CLASSES_MAP = {
    Tank: wowRoleClassSchema.shape.Tank.options,
    Healer: wowRoleClassSchema.shape.Healer.options,
    DPS: wowRoleClassSchema.shape.DPS.options,
}

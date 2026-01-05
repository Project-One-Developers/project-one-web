import { z } from "zod"
import {
    wowArmorTypeSchema,
    wowItemEquippedSlotKeySchema,
    wowItemSlotKeySchema,
    wowItemTrackNameSchema,
} from "./wow.models"

export const itemSchema = z.object({
    id: z.number(),
    name: z.string(),
    ilvlBase: z.number(),
    ilvlMythic: z.number(),
    ilvlHeroic: z.number(),
    ilvlNormal: z.number(),
    slotKey: wowItemSlotKeySchema,
    itemSubclass: z.string().nullable(),
    armorType: wowArmorTypeSchema.nullable(),
    tierset: z.boolean(),
    token: z.boolean(),
    veryRare: z.boolean().default(false),
    catalyzed: z.boolean().default(false),
    specIds: z.number().array().nullable(),
    classIds: z.number().array().nullable(),
    iconName: z.string(),
    bossName: z.string(),
    bossId: z.number(),
    sourceId: z.number(), // instance id (eg: raid id, profession id, mplus name)
    sourceName: z.string(),
    sourceType: z.string(),
    season: z.number(),
    note: z.string().nullable(),
})
export type Item = z.infer<typeof itemSchema>

export const itemToTiersetSchema = z.object({
    itemId: z.number(),
    tokenId: z.number(),
    classId: z.number(),
})
export type ItemToTierset = z.infer<typeof itemToTiersetSchema>
export const itemToTiersetArraySchema = z.array(itemToTiersetSchema)

export const itemToCatalystSchema = z.object({
    itemId: z.number(),
    encounterId: z.number(),
    catalyzedItemId: z.number(),
})
export type ItemToCatalyst = z.infer<typeof itemToCatalystSchema>
export const itemToCatalystArraySchema = z.array(itemToCatalystSchema)

// Bonus item track from database (with ID for DB key)
export const bonusItemTrackSchema = z.object({
    id: z.number(), // Bonus ID (primary key in DB)
    level: z.number(),
    max: z.number(),
    name: wowItemTrackNameSchema,
    fullName: z.string(),
    itemLevel: z.number(),
    maxItemLevel: z.number(),
    season: z.number(),
})
export type BonusItemTrack = z.infer<typeof bonusItemTrackSchema>

export const itemTrackSchema = z.object({
    name: wowItemTrackNameSchema,
    fullName: z.string(),
    level: z.number(),
    max: z.number(),
    itemLevel: z.number(),
    season: z.number(),
    maxItemLevel: z.number(),
})
export type ItemTrack = z.infer<typeof itemTrackSchema>

/**
 * Represents a looted version of an item (so with bonus and actual ilvl)
 */
export const gearItemSchema = z.object({
    item: z.object({
        id: itemSchema.shape.id,
        name: itemSchema.shape.name,
        armorType: itemSchema.shape.armorType,
        slotKey: itemSchema.shape.slotKey,
        token: itemSchema.shape.token,
        tierset: itemSchema.shape.tierset,
        veryRare: itemSchema.shape.veryRare,
        iconName: itemSchema.shape.iconName,
        season: itemSchema.shape.season,
        specIds: itemSchema.shape.specIds,
    }),
    source: z.enum(["equipped", "bag", "great-vault", "loot"]),
    equippedInSlot: wowItemEquippedSlotKeySchema.optional(),
    itemLevel: z.number(),
    itemTrack: itemTrackSchema.nullable(),
    bonusIds: z.array(z.number()).nullable(),
    enchantIds: z.array(z.number()).nullable(),
    gemIds: z.array(z.number()).nullable(),
    craftedStats: z.string().optional(),
    craftingQuality: z.string().optional(),
})
export type GearItem = z.infer<typeof gearItemSchema>

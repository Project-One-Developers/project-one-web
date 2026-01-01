import { z } from "zod"
import { gearItemSchema, itemSchema } from "./item.models"
import {
    wowClassNameSchema,
    wowItemEquippedSlotKeySchema,
    wowRaidDiffSchema,
} from "./wow.models"

// Helper to round to 2 decimal places
const twoDecimals = z.number().transform((n) => Math.round(n * 100) / 100)

export const droptimizerUpgradeSchema = z.object({
    id: z.string(),
    dps: z.number(),
    item: itemSchema,
    ilvl: z.number(),
    slot: wowItemEquippedSlotKeySchema,
    catalyzedItemId: itemSchema.shape.id.nullable(),
    tiersetItemId: itemSchema.shape.id.nullable(),
    droptimizerId: z.string(),
})
export type DroptimizerUpgrade = z.infer<typeof droptimizerUpgradeSchema>

export const newDroptimizerUpgradeSchema = droptimizerUpgradeSchema
    .omit({
        id: true,
        item: true,
        droptimizerId: true,
    })
    .extend({
        itemId: z.number(),
    })
export type NewDroptimizerUpgrade = z.infer<typeof newDroptimizerUpgradeSchema>

export const droptimizerCurrencySchema = z.object({
    id: z.number(),
    type: z.string(),
    amount: z.number(),
})
export type DroptimizerCurrency = z.infer<typeof droptimizerCurrencySchema>

// Char info from sim (class/spec/talents can differ from current character data)
const charInfoSchema = z.object({
    class: wowClassNameSchema,
    classId: z.number().min(1).max(13), // https://wowpedia.fandom.com/wiki/ClassId
    spec: z.string(),
    specId: z.number(), // https://wowpedia.fandom.com/wiki/SpecializationID
    talents: z.string(),
})

// Extended char info for parsing incoming data (includes name/server for character resolution)
const newCharInfoSchema = charInfoSchema.extend({
    name: z.string(),
    server: z.string(),
})

export const droptimizerSchema = z.object({
    id: z.string(),
    url: z.url(),
    characterId: z.string(),
    dateImported: z.number(),
    simInfo: z.object({
        date: z.number(),
        fightstyle: z.string(),
        duration: z.number().min(1),
        nTargets: z.number().min(1),
        upgradeEquipped: z.boolean(),
    }),
    raidInfo: z.object({
        id: z.number(),
        difficulty: wowRaidDiffSchema,
    }),
    charInfo: charInfoSchema,
    upgrades: z.array(droptimizerUpgradeSchema),
    weeklyChest: z.array(gearItemSchema),
    currencies: z.array(droptimizerCurrencySchema),
    itemsAverageItemLevel: twoDecimals.nullable(),
    itemsAverageItemLevelEquipped: twoDecimals.nullable(),
    itemsInBag: z.array(gearItemSchema),
    itemsEquipped: z.array(gearItemSchema),
    tiersetInfo: z.array(gearItemSchema),
})
export type Droptimizer = z.infer<typeof droptimizerSchema>

export const newDroptimizerSchema = droptimizerSchema
    .omit({ id: true, characterId: true, upgrades: true, charInfo: true })
    .extend({
        charInfo: newCharInfoSchema,
        upgrades: z.array(newDroptimizerUpgradeSchema),
    })
export type NewDroptimizer = z.infer<typeof newDroptimizerSchema>

export const raidbotsURLSchema = z
    .url()
    .refine((url) => url.includes("raidbots.com/simbot/report"), {
        message: "URL must be a raidbots.com report URL",
    })
    .brand("RaidbotsURL")
export type RaidbotsURL = z.infer<typeof raidbotsURLSchema>

export const qeLiveURLSchema = z
    .url()
    .refine((url) => url.includes("questionablyepic.com/live/upgradereport"), {
        message: "URL must be a questionablyepic.com report URL",
    })
    .brand("QuestionableEpicURL")
export type QELiveURL = z.infer<typeof qeLiveURLSchema>

export const simcSchema = z.object({
    id: z.string(),
    characterId: z.string(),
    hash: z.string(),
    dateGenerated: z.number(),
    weeklyChest: z.array(gearItemSchema),
    currencies: z.array(droptimizerCurrencySchema),
    itemsInBag: z.array(gearItemSchema),
    itemsEquipped: z.array(gearItemSchema),
    tiersetInfo: z.array(gearItemSchema),
})
export type SimC = z.infer<typeof simcSchema>

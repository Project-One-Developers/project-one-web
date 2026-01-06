/**
 * Zod schemas for Raidbots static data API
 * https://www.raidbots.com/static/data/live/
 */
import "server-only"
import { z } from "zod"

// ============================================================================
// encounter-items.json schemas
// ============================================================================

const raidbotsItemSourceSchema = z.object({
    instanceId: z.number().optional(),
    encounterId: z.number(),
    veryRare: z.boolean().optional(),
})

const raidbotsItemStatSchema = z.object({
    id: z.number(),
    alloc: z.number(),
})

const raidbotsItemSchema = z.object({
    id: z.number(),
    name: z.string(),
    icon: z.string(),
    quality: z.number().optional(),
    itemClass: z.number(),
    itemSubClass: z.number(),
    inventoryType: z.number().optional(),
    itemLevel: z.number(),
    uniqueEquipped: z.boolean().optional(),
    specs: z.array(z.number()).optional(),
    stats: z.array(raidbotsItemStatSchema).optional(),
    sources: z.array(raidbotsItemSourceSchema).default([]),
    onUseTrinket: z.boolean().optional(),
    expansion: z.number().optional(),
    contains: z.array(z.number()).optional(), // For tokens - IDs of items they generate
    itemSetId: z.number().optional(), // Tier set ID
    allowableClasses: z.array(z.number()).optional(), // Classes that can use item
})
export type RaidbotsItem = z.infer<typeof raidbotsItemSchema>

export const raidbotsEncounterItemsSchema = z.array(raidbotsItemSchema)

// ============================================================================
// instances.json schemas
// ============================================================================

/** Known instance types from Raidbots API */
const instanceTypeSchema = z.enum([
    "raid",
    "mplus-chest",
    "catalyst",
    "profession593",
    "delve-epic",
    "delve",
    "world",
    "pvp",
])

const raidbotsEncounterSchema = z.object({
    id: z.number(),
    name: z.string(),
    order: z.number().optional(),
    icon_button: z.string().optional(),
})

const raidbotsInstanceSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    order: z.number().optional(),
    type: instanceTypeSchema.or(z.string()), // Known types with fallback to string for new types
    encounters: z.array(raidbotsEncounterSchema).optional(),
})

export type RaidbotsInstance = z.infer<typeof raidbotsInstanceSchema>
export type RaidbotsEncounter = z.infer<typeof raidbotsEncounterSchema>

export const raidbotsInstancesSchema = z.array(raidbotsInstanceSchema)

// ============================================================================
// bonuses.json schemas
// ============================================================================

const raidbotsBonusUpgradeSchema = z.object({
    group: z.number(),
    level: z.number(),
    max: z.number(),
    name: z.string().optional(),
    fullName: z.string().optional(),
    bonusId: z.number(),
    itemLevel: z.number(),
    seasonId: z.number().optional(),
})

export const raidbotsBonusEntrySchema = z.object({
    id: z.number(),
    quality: z.number().optional(),
    tag: z.string().optional(),
    level: z.number().optional(),
    stats: z.string().optional(),
    name: z.string().optional(),
    upgrade: raidbotsBonusUpgradeSchema.optional(),
})

// The bonuses.json is an object with string keys (bonus IDs)
export const raidbotsBonusesSchema = z.record(z.string(), raidbotsBonusEntrySchema)
export type RaidbotsBonuses = z.infer<typeof raidbotsBonusesSchema>

import { z } from "zod"
import { MAX_CHARACTER_NAME_LENGTH } from "@/shared/wow.consts"
import { gearItemSchema } from "./item.models"

// Encounter schema - for raid progression tracking
// Note: Blizzard API only provides numKills and lastDefeated (no first kill date or ilvl)
export const encounterSchema = z.object({
    encounterId: z.number(),
    numKills: z.number(),
    lastDefeated: z.string().nullable(),
})

// Helper to round to 2 decimal places
const twoDecimals = z.number().transform((n) => Math.round(n * 100) / 100)

// Character Blizzard schema (character data from Blizzard API)
export const charBlizzardSchema = z.object({
    name: z.string().max(MAX_CHARACTER_NAME_LENGTH),
    realm: z.string(),
    race: z.string().nullable(),
    blizzardCharacterId: z.number(),
    syncedAt: z.number(),
    lastLoginAt: z.number(),
    averageItemLevel: twoDecimals.nullable(),
    equippedItemLevel: twoDecimals.nullable(),
    itemsEquipped: z.array(gearItemSchema),
    mountIds: z.array(z.number()).nullable(), // Mount collection from Blizzard API
})

// Types
export type CharacterBlizzard = z.infer<typeof charBlizzardSchema>
export type BlizzardEncounter = z.infer<typeof encounterSchema>

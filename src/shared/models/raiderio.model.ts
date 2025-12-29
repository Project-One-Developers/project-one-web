import { z } from "zod"
import { gearItemSchema } from "./item.model"

// Encounter schema - Zod strips extra fields from API response
export const encounterSchema = z.object({
    slug: z.string(),
    itemLevel: z.number(),
    numKills: z.number(),
    firstDefeated: z.string().nullable(),
    lastDefeated: z.string().nullable(),
})

// API response schemas (lowercase keys from Raider.io)
export const encountersDefeatedSchema = z.object({
    normal: z.array(encounterSchema).optional(),
    heroic: z.array(encounterSchema).optional(),
    mythic: z.array(encounterSchema).optional(),
})

export const raidProgressSchema = z.object({
    raid: z.string(),
    encountersDefeated: encountersDefeatedSchema,
})

export const raiderIoProgressSchema = z.object({
    tier: z.string(),
    raidProgress: z.array(raidProgressSchema),
})

// Character raiderio schema (without progress - now in character_encounters table)
export const charRaiderioSchema = z.object({
    name: z.string().max(24),
    realm: z.string(),
    race: z.string().nullable(),
    characterId: z.number(),
    p1SyncAt: z.number(),
    loggedOutAt: z.number(),
    itemUpdateAt: z.number(),
    averageItemLevel: z.string().nullable(),
    itemsEquipped: z.array(gearItemSchema),
})

// Types
export type CharacterRaiderio = z.infer<typeof charRaiderioSchema>
export type RaiderioProgress = z.infer<typeof raiderIoProgressSchema>
export type RaiderioEncounter = z.infer<typeof encounterSchema>
// export type RaiderioEncountersDefeated = z.infer<typeof encountersDefeatedSchema>
// export type RaiderioRaidProgress = z.infer<typeof raidProgressSchema>

// export type CharacterBossProgressionResponse = z.infer<typeof characterBossProgressionSchema>

// // New types for character details
// export type RaiderioGemDetail = z.infer<typeof gemDetailSchema>
// export type RaiderioEnchantDetail = z.infer<typeof enchantDetailSchema>
// export type RaiderioItem = z.infer<typeof itemSchema>

// export type RaiderioItemDetails = z.infer<typeof itemDetailsSchema>
// export type RaiderioCharacterDetails = z.infer<typeof characterDetailsSchema>

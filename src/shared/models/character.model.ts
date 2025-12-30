import { z } from "zod"
import { charBlizzardSchema, encounterSchema } from "./blizzard.model"
import { gearItemSchema } from "./item.model"
import { droptimizerSchema } from "./simulation.model"
import { wowClassNameSchema, wowRolesSchema } from "./wow.model"

export const playerSchema = z.object({
    id: z.uuid(),
    name: z.string().min(1),
})
export type Player = z.infer<typeof playerSchema>

export const characterSchema = z.object({
    id: z.uuid(),
    name: z.string().min(1),
    realm: z.string().min(1),
    class: wowClassNameSchema,
    role: wowRolesSchema,
    main: z.boolean(),
    playerId: playerSchema.shape.id,
})
export type Character = z.infer<typeof characterSchema>

export const characterWithPlayerSchema = characterSchema.extend({
    player: playerSchema,
})
export type CharacterWithPlayer = z.infer<typeof characterWithPlayerSchema>

export const playerWithCharacterSchema = playerSchema.extend({
    characters: z.array(characterSchema),
})
export type PlayerWithCharacters = z.infer<typeof playerWithCharacterSchema>

export const newPlayerSchema = playerSchema.omit({
    id: true,
})
export type NewPlayer = z.infer<typeof newPlayerSchema>

export const editPlayerSchema = newPlayerSchema.extend({
    id: playerSchema.shape.id,
})
export type EditPlayer = z.infer<typeof editPlayerSchema>

export const playersListSchema = z.object({
    players: z.array(playerSchema),
})

export const newCharacterSchema = characterSchema.omit({
    id: true,
})
export type NewCharacter = z.infer<typeof newCharacterSchema>

export const editCharacterSchema = characterSchema.extend({
    id: characterSchema.shape.id,
})
export type EditCharacter = z.infer<typeof editCharacterSchema>

export const characterGameInfoSchema = z.object({
    droptimizer: droptimizerSchema.nullable(),
    blizzard: charBlizzardSchema.nullable(),
})
export type CharacterGameInfo = z.infer<typeof characterGameInfoSchema>

// Compact schemas for summary display - fields nullable due to LEFT JOINs
export const characterGameInfoCompactSchema = z.object({
    charName: z.string(),
    charRealm: z.string(),
    droptimizer: z
        .object({
            simDate: z.number(),
            itemsAverageItemLevelEquipped:
                droptimizerSchema.shape.itemsAverageItemLevelEquipped,
            tiersetInfo: droptimizerSchema.shape.tiersetInfo.nullable(),
            weeklyChest: droptimizerSchema.shape.weeklyChest.nullable(),
            currencies: droptimizerSchema.shape.currencies.nullable(),
        })
        .nullable(),
    blizzard: z
        .object({
            equippedItemLevel: charBlizzardSchema.shape.equippedItemLevel,
            itemsEquipped: charBlizzardSchema.shape.itemsEquipped.nullable(),
        })
        .nullable(),
})
export type CharacterGameInfoCompact = z.infer<typeof characterGameInfoCompactSchema>

export const characterWithProgressionSchema = z.object({
    p1Character: characterSchema,
    blizzard: charBlizzardSchema.nullable(),
})
export type CharacterWithProgression = z.infer<typeof characterWithProgressionSchema>

export const characterWithGears = characterSchema.extend({
    gears: gearItemSchema.array(),
})
export type CharacterWithGears = z.infer<typeof characterWithGears>

// Character with pre-built encounter lookup map (for raid progression page)
export const characterWithEncountersSchema = z.object({
    p1Character: characterSchema,
    // Pre-built map: "difficulty-blizzardEncounterId" → BlizzardEncounter
    encounters: z.record(z.string(), encounterSchema),
})
export type CharacterWithEncounters = z.infer<typeof characterWithEncountersSchema>

import { z } from "zod"
import { charBlizzardSchema } from "./blizzard.models"
import { gearItemSchema } from "./item.models"
import { droptimizerSchema } from "./simulation.models"
import { wowClassNameSchema, wowRolesSchema } from "./wow.models"

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
    priority: z.number().int().min(1).max(100).optional(), // officer-only, undefined for members
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

export const newCharacterWithoutClassSchema = newCharacterSchema.omit({
    class: true,
})
export type NewCharacterWithoutClass = z.infer<typeof newCharacterWithoutClassSchema>

export const editCharacterDataSchema = characterSchema
    .pick({
        name: true,
        realm: true,
        class: true,
        role: true,
        main: true,
        priority: true,
    })
    .extend({
        class: characterSchema.shape.class.optional(), // Class is optional for edits
    })
export type EditCharacterData = z.infer<typeof editCharacterDataSchema>

export const characterGameInfoSchema = z.object({
    droptimizer: droptimizerSchema.nullable(),
    blizzard: charBlizzardSchema.nullable(),
})
export type CharacterGameInfo = z.infer<typeof characterGameInfoSchema>

export const characterWithGameInfoSchema = characterWithPlayerSchema.extend({
    gameInfo: characterGameInfoSchema,
})
export type CharacterWithGameInfo = z.infer<typeof characterWithGameInfoSchema>

// Compact schemas for summary display - fields nullable due to LEFT JOINs
export const characterGameInfoCompactSchema = z.object({
    charId: z.string(),
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
            syncedAt: charBlizzardSchema.shape.syncedAt,
        })
        .nullable(),
})
export type CharacterGameInfoCompact = z.infer<typeof characterGameInfoCompactSchema>

export const characterWithGears = characterSchema.extend({
    gears: gearItemSchema.array(),
})
export type CharacterWithGears = z.infer<typeof characterWithGears>

// Minimal character info for raid progression display
export const progressionCharacterSchema = z.object({
    id: z.string(),
    name: z.string(),
    class: wowClassNameSchema,
    role: wowRolesSchema,
    main: z.boolean(),
})
export type ProgressionCharacter = z.infer<typeof progressionCharacterSchema>

// Character with encounter info (for defeated characters)
export const defeatedCharacterSchema = progressionCharacterSchema.extend({
    numKills: z.number(),
    lastDefeated: z.string().nullable(),
})
export type DefeatedCharacter = z.infer<typeof defeatedCharacterSchema>

// Per-boss progress data (pre-computed on server)
export const bossProgressSchema = z.object({
    defeated: z.object({
        Tank: z.array(defeatedCharacterSchema),
        Healer: z.array(defeatedCharacterSchema),
        DPS: z.array(defeatedCharacterSchema),
    }),
    notDefeated: z.array(progressionCharacterSchema),
})
export type BossProgress = z.infer<typeof bossProgressSchema>

// Full roster progression keyed by difficulty, then by bossId (string keys since JSON serializes numbers as strings)
export const rosterProgressionByDifficultySchema = z.object({
    Mythic: z.record(z.string(), bossProgressSchema),
    Heroic: z.record(z.string(), bossProgressSchema),
    Normal: z.record(z.string(), bossProgressSchema),
})
export type RosterProgressionByDifficulty = z.infer<
    typeof rosterProgressionByDifficultySchema
>

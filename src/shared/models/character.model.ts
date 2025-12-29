import { z } from "zod"
import { gearItemSchema } from "./item.model"
import { charRaiderioSchema } from "./raiderio.model"
import { droptimizerSchema } from "./simulation.model"
import { wowClassNameSchema, wowRolesSchema } from "./wow.model"
import { charWowAuditSchema } from "./wowaudit.model"

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
    wowaudit: charWowAuditSchema.nullable(),
    raiderio: charRaiderioSchema.nullable(),
})
export type CharacterGameInfo = z.infer<typeof characterGameInfoSchema>

export const characterWithProgressionSchema = z.object({
    p1Character: characterSchema,
    raiderIo: charRaiderioSchema.nullable(),
})
export type CharacterWithProgression = z.infer<typeof characterWithProgressionSchema>

export const characterWithGears = characterSchema.extend({
    gears: gearItemSchema.array(),
})
export type CharacterWithGears = z.infer<typeof characterWithGears>

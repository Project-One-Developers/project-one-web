import { z } from "zod"
import { wowClassNameSchema } from "./wow.models"

// Schema for player mount status response
export const playerMountStatusSchema = z.object({
    playerId: z.string(),
    playerName: z.string(),
    characterId: z.string(),
    characterName: z.string(),
    characterClass: wowClassNameSchema,
    characterRealm: z.string(),
    equippedItemLevel: z.number().nullable(),
    lastLoginAt: z.number().nullable(),
    hasMount: z.boolean(),
})
export type PlayerMountStatus = z.infer<typeof playerMountStatusSchema>

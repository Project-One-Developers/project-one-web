import { z } from "zod"

import { characterSchema } from "./character.model"

export const raidSessionSchema = z.object({
    id: z.string(),
    name: z.string(),
    raidDate: z.number(),
})
export type RaidSession = z.infer<typeof raidSessionSchema>

export const raidSessionWithRosterSchema = raidSessionSchema.extend({
    roster: z.array(characterSchema),
})
export type RaidSessionWithRoster = z.infer<typeof raidSessionWithRosterSchema>

export const raidSessionWithSummarySchema = raidSessionSchema.extend({
    rosterCount: z.number(),
    lootCount: z.number(),
})
export type RaidSessionWithSummary = z.infer<typeof raidSessionWithSummarySchema>

export const newRaidSessionSchema = z.object({
    name: z.string().min(1, "Session name is required"),
    raidDate: z.number(),
    roster: z.array(z.string()), // array of character ids
})
export type NewRaidSession = z.infer<typeof newRaidSessionSchema>

export const editRaidSessionSchema = newRaidSessionSchema.extend({
    id: raidSessionWithRosterSchema.shape.id,
})
export type EditRaidSession = z.infer<typeof editRaidSessionSchema>

import { z } from "zod"
import type { CharacterSummaryCompact } from "@/shared/types"

export const splitRunParamsSchema = z.object({
    numRuns: z.number().int().min(1).max(10),
    targetSize: z.number().int().min(10).max(30),
    minItemLevel: z.number().int().min(0).max(1000).optional(),
})
export type SplitRunParams = z.infer<typeof splitRunParamsSchema>

export const runStatsSchema = z.object({
    tanks: z.number(),
    healers: z.number(),
    dps: z.number(),
    armorTypes: z.record(z.string(), z.number()),
})
export type RunStats = {
    tanks: number
    healers: number
    dps: number
    armorTypes: Partial<Record<string, number>>
}

export type Run = {
    id: string
    characters: CharacterSummaryCompact[]
    stats: RunStats
    warnings: string[]
}

import { z } from "zod"

export const cronLogSchema = z.object({
    id: z.number(),
    jobName: z.string(),
    status: z.enum(["success", "failed"]),
    results: z.unknown().nullable(),
    errorMessage: z.string().nullable(),
    startedAt: z.date(),
    completedAt: z.date(),
    durationMs: z.number(),
})
export type CronLog = z.infer<typeof cronLogSchema>

export const newCronLogSchema = cronLogSchema.omit({ id: true })
export type NewCronLog = z.infer<typeof newCronLogSchema>

// Results schema for sync-all cron job
export const syncAllResultsSchema = z.object({
    discord: z.object({
        success: z.boolean(),
        imported: z.number(),
        skipped: z.number(),
        errors: z.array(z.string()),
    }),
    cleanup: z.object({
        success: z.boolean(),
        error: z.string().nullable(),
    }),
})
export type SyncAllResults = z.infer<typeof syncAllResultsSchema>

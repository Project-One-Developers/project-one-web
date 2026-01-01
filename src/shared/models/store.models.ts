import { z } from "zod"

export const appSettingsSchema = z.object({
    databaseUrl: z.string().min(1),
})
export type AppSettings = z.infer<typeof appSettingsSchema>

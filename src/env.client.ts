import { z } from "zod"

const envSchema = z.object({
    NEXT_PUBLIC_BUILD_ID: z.string().optional(),
    // Dev overrides (optional)
    // Season validation happens in season-config.ts to avoid circular dependency
    NEXT_PUBLIC_OVERRIDE_CURRENT_SEASON: z.coerce.number().int().positive().optional(),
    NEXT_PUBLIC_OVERRIDE_WOWHEAD_HOST: z.string().optional(),
})

export const clientEnv = envSchema.parse({
    NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID,
    NEXT_PUBLIC_OVERRIDE_CURRENT_SEASON: process.env.NEXT_PUBLIC_OVERRIDE_CURRENT_SEASON,
    NEXT_PUBLIC_OVERRIDE_WOWHEAD_HOST: process.env.NEXT_PUBLIC_OVERRIDE_WOWHEAD_HOST,
})

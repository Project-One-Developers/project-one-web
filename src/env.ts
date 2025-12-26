import { z } from "zod"

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string(),
    DISCORD_GUILD_ID: z.string(),
    DISCORD_ALLOWED_ROLES: z.string().transform((v) => v.split(",")),
    CRON_SECRET: z.string().optional(),
    // Next-Auth (also validated by next-auth itself)
    AUTH_DISCORD_ID: z.string(),
    AUTH_DISCORD_SECRET: z.string(),
    AUTH_SECRET: z.string(),
})

export const env = envSchema.parse(process.env)

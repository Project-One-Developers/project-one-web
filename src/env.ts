import "server-only"
import { z } from "zod"

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string(),
    DISCORD_GUILD_ID: z.string(),
    DISCORD_OFFICER_ROLES_IDS: z.string().transform((v) => v.split(",")),
    DISCORD_MEMBER_ROLES_IDS: z
        .string()
        .optional()
        .default("")
        .transform((v) => (v ? v.split(",") : [])),
    DISCORD_DROPTIMIZER_CHANNEL_ID: z.string(),
    DISCORD_BOT_TOKEN: z.string(),
    CRON_SECRET: z.string().optional(),
    // Next-Auth (also validated by next-auth itself)
    AUTH_DISCORD_ID: z.string(),
    AUTH_DISCORD_SECRET: z.string(),
    AUTH_SECRET: z.string(),
    // Battle.net API
    BNET_CLIENT_ID: z.string(),
    BNET_CLIENT_SECRET: z.string(),
    // Dev overrides (optional)
    OVERRIDE_RAIDBOTS_BASE_URL: z.url().optional(),
})

export const env = envSchema.parse(process.env)

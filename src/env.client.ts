import { z } from "zod"

const envSchema = z.object({
    NEXT_PUBLIC_BUILD_ID: z.string().optional(),
})

export const clientEnv = envSchema.parse({
    NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID,
})

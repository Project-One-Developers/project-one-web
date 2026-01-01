import { defineConfig } from "drizzle-kit"
import { z } from "zod"

const DATABASE_URL = z.string().parse(process.env.DATABASE_URL)

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dbCredentials: {
        url: DATABASE_URL,
    },
})

import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import "server-only"
import { env } from "@/env"
import * as schema from "./schema"

// Lazy initialization to avoid build-time errors
let _db: NodePgDatabase<typeof schema> | null = null
let _pool: Pool | null = null

function getDb(): NodePgDatabase<typeof schema> {
    if (_db) {
        return _db
    }

    _pool = new Pool({
        connectionString: env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        min: 0,
        max: 10,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 5_000,
    })

    _db = drizzle(_pool, { schema })
    return _db
}

// Proxy to lazily initialize the database connection
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Deliberate proxy pattern for lazy DB initialization
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
    get(_, prop) {
        const database = getDb()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Dynamic property access
        const value = database[prop as keyof typeof database]
        if (typeof value === "function") {
            return value.bind(database)
        }
        return value
    },
})

// Export schema for use in other files
export * from "./schema"

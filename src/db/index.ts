import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

// Lazy initialization to avoid build-time errors
let _db: NodePgDatabase<typeof schema> | null = null
let _pool: Pool | null = null

function getDb(): NodePgDatabase<typeof schema> {
    if (_db) {
        return _db
    }

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
        throw new Error(
            "DATABASE_URL environment variable is not set. " +
                "Please set it in your .env.local file or environment variables."
        )
    }

    _pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
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

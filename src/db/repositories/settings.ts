import { eq } from "drizzle-orm"
import { db } from "@/db"
import { appConfigTable } from "@/db/schema"

export const settingsRepo = {
    get: async (key: string): Promise<string | null> => {
        const result = await db
            .select({ value: appConfigTable.value })
            .from(appConfigTable)
            .where(eq(appConfigTable.key, key))
            .then((r) => r.at(0))

        if (!result) {
            return null
        }
        return result.value
    },

    set: async (key: string, value: string): Promise<void> => {
        await db.insert(appConfigTable).values({ key, value }).onConflictDoUpdate({
            target: appConfigTable.key,
            set: { value },
        })
    },

    delete: async (key: string): Promise<void> => {
        await db.delete(appConfigTable).where(eq(appConfigTable.key, key))
    },

    getAll: async (): Promise<Record<string, string>> => {
        const result = await db.select().from(appConfigTable)
        return result.reduce<Record<string, string>>((acc, { key, value }) => {
            acc[key] = value
            return acc
        }, {})
    },
}

import { db } from "@/db"
import { appConfigTable } from "@/db/schema"
import { takeFirstResult } from "@/db/utils"
import { eq } from "drizzle-orm"

export async function getConfig(key: string): Promise<string | null> {
    const result = await db
        .select()
        .from(appConfigTable)
        .where(eq(appConfigTable.key, key))
        .then(takeFirstResult)

    if (!result) return null
    return result.value
}

export async function setConfig(key: string, value: string): Promise<void> {
    await db.insert(appConfigTable).values({ key, value }).onConflictDoUpdate({
        target: appConfigTable.key,
        set: { value },
    })
}

export async function deleteConfig(key: string): Promise<void> {
    await db.delete(appConfigTable).where(eq(appConfigTable.key, key))
}

export async function getAllConfig(): Promise<Record<string, string>> {
    const result = await db.select().from(appConfigTable)
    return result.reduce(
        (acc, { key, value }) => {
            acc[key] = value
            return acc
        },
        {} as Record<string, string>
    )
}

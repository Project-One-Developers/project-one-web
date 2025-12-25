import { db } from "@/db"
import { charRaiderioTable } from "@/db/schema"
import { CharacterRaiderio, charRaiderioSchema } from "@/shared/schemas/raiderio.schemas"
import { conflictUpdateAllExcept } from "@/db/utils"
import { z } from "zod"

export async function addCharacterRaiderio(
    characters: CharacterRaiderio[]
): Promise<void> {
    await db.insert(charRaiderioTable).values(characters)
}

export async function upsertCharacterRaiderio(
    characters: CharacterRaiderio[]
): Promise<void> {
    await db
        .insert(charRaiderioTable)
        .values(characters)
        .onConflictDoUpdate({
            target: [charRaiderioTable.name, charRaiderioTable.realm],
            set: conflictUpdateAllExcept(charRaiderioTable, ["name", "realm"]),
        })
}

export async function getLastTimeSyncedRaiderio(): Promise<number | null> {
    const result = await db.query.charRaiderioTable.findFirst({
        orderBy: (charRaiderioTable, { desc }) => desc(charRaiderioTable.p1SyncAt),
    })
    return result ? result.p1SyncAt : null
}

export async function getLastRaiderioInfo(
    charName: string,
    charRealm: string
): Promise<CharacterRaiderio | null> {
    const result = await db.query.charRaiderioTable.findFirst({
        where: (charRaiderioTable, { eq, and }) =>
            and(
                eq(charRaiderioTable.name, charName),
                eq(charRaiderioTable.realm, charRealm)
            ),
    })
    return result ? charRaiderioSchema.parse(result) : null
}

export async function getAllCharacterRaiderio(): Promise<CharacterRaiderio[]> {
    const result = await db.query.charRaiderioTable.findMany()
    return z.array(charRaiderioSchema).parse(result)
}

export async function deleteAllCharacterRaiderio(): Promise<void> {
    await db.delete(charRaiderioTable)
}

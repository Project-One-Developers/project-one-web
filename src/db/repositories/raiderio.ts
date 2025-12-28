import { and, eq, or } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { charRaiderioTable } from "@/db/schema"
import { conflictUpdateAllExcept } from "@/db/utils"
import { CharacterRaiderio, charRaiderioSchema } from "@/shared/models/raiderio.model"

export const raiderioRepo = {
    upsert: async (characters: CharacterRaiderio[]): Promise<void> => {
        await db
            .insert(charRaiderioTable)
            .values(characters)
            .onConflictDoUpdate({
                target: [charRaiderioTable.name, charRaiderioTable.realm],
                set: conflictUpdateAllExcept(charRaiderioTable, ["name", "realm"]),
            })
    },

    getLastTimeSynced: async (): Promise<number | null> => {
        const result = await db.query.charRaiderioTable.findFirst({
            orderBy: (charRaiderioTable, { desc }) => desc(charRaiderioTable.p1SyncAt),
        })
        return result ? result.p1SyncAt : null
    },

    getByChar: async (
        charName: string,
        charRealm: string
    ): Promise<CharacterRaiderio | null> => {
        const result = await db.query.charRaiderioTable.findFirst({
            where: (charRaiderioTable, { eq, and }) =>
                and(
                    eq(charRaiderioTable.name, charName),
                    eq(charRaiderioTable.realm, charRealm)
                ),
        })
        return result ? charRaiderioSchema.parse(result) : null
    },

    getAll: async (): Promise<CharacterRaiderio[]> => {
        const result = await db.query.charRaiderioTable.findMany()
        return z.array(charRaiderioSchema).parse(result)
    },

    getByChars: async (
        chars: { name: string; realm: string }[]
    ): Promise<CharacterRaiderio[]> => {
        if (chars.length === 0) {
            return []
        }

        const result = await db.query.charRaiderioTable.findMany({
            where: or(
                ...chars.map((c) =>
                    and(
                        eq(charRaiderioTable.name, c.name),
                        eq(charRaiderioTable.realm, c.realm)
                    )
                )
            ),
        })
        return z.array(charRaiderioSchema).parse(result)
    },
}

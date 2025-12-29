import { eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { charTable, playerTable } from "@/db/schema"
import { identity, mapAndParse, newUUID } from "@/db/utils"
import {
    characterSchema,
    characterWithPlayerSchema,
    type Character,
    type CharacterWithPlayer,
    type EditCharacter,
    type NewCharacter,
} from "@/shared/models/character.model"

export const characterRepo = {
    getWithPlayerById: async (id: string): Promise<CharacterWithPlayer | null> => {
        const result = await db
            .select({ character: charTable, player: playerTable })
            .from(charTable)
            .innerJoin(playerTable, eq(charTable.playerId, playerTable.id))
            .where(eq(charTable.id, id))
            .then((r) => r.at(0))

        if (!result) {
            return null
        }

        return mapAndParse(
            result,
            (r) => ({ ...r.character, player: r.player }),
            characterWithPlayerSchema
        )
    },

    getWithPlayerList: async (): Promise<CharacterWithPlayer[]> => {
        const result = await db
            .select({ character: charTable, player: playerTable })
            .from(charTable)
            .innerJoin(playerTable, eq(charTable.playerId, playerTable.id))

        const mapped = result.map((r) => ({ ...r.character, player: r.player }))
        return mapAndParse(mapped, identity, characterWithPlayerSchema)
    },

    getList: async (showMains = true, showAlts = true): Promise<Character[]> => {
        // Both false = nothing to show
        if (!showMains && !showAlts) {
            return []
        }

        const filter = showMains && showAlts ? undefined : eq(charTable.main, showMains)

        const result = await db.select().from(charTable).where(filter)
        return mapAndParse(result, identity, characterSchema)
    },

    add: async (character: NewCharacter): Promise<string> => {
        const id = newUUID()

        await db.insert(charTable).values({
            id,
            name: character.name,
            realm: character.realm,
            class: character.class,
            role: character.role,
            main: character.main,
            playerId: character.playerId,
        })

        return id
    },

    edit: async (edited: EditCharacter): Promise<void> => {
        await db
            .update(charTable)
            .set({
                name: edited.name,
                realm: edited.realm,
                class: edited.class,
                role: edited.role,
                main: edited.main,
            })
            .where(eq(charTable.id, edited.id))
    },

    delete: async (id: string): Promise<void> => {
        await db.delete(charTable).where(eq(charTable.id, id))
    },

    getByIds: async (ids: string[]): Promise<CharacterWithPlayer[]> => {
        if (ids.length === 0) {
            return []
        }
        const result = await db
            .select({ character: charTable, player: playerTable })
            .from(charTable)
            .innerJoin(playerTable, eq(charTable.playerId, playerTable.id))
            .where(inArray(charTable.id, ids))

        const mapped = result.map((r) => ({ ...r.character, player: r.player }))
        return mapAndParse(mapped, identity, characterWithPlayerSchema)
    },
}

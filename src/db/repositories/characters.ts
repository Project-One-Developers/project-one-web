import { and, asc, eq, inArray, or } from "drizzle-orm"
import "server-only"
import { db } from "@/db"
import { charTable, playerTable } from "@/db/schema"
import { identity, mapAndParse, newUUID } from "@/db/utils"
import {
    characterSchema,
    characterWithPlayerSchema,
    type Character,
    type CharacterWithPlayer,
    type EditCharacterData,
    type NewCharacter,
} from "@/shared/models/character.models"

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

        const result = await db
            .select()
            .from(charTable)
            .where(filter)
            .orderBy(asc(charTable.name))
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

    edit: async (id: string, data: EditCharacterData): Promise<void> => {
        await db
            .update(charTable)
            .set({
                name: data.name,
                realm: data.realm,
                role: data.role,
                main: data.main,
                priority: data.priority,
            })
            .where(eq(charTable.id, id))
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

    hasMain: async (playerId: string): Promise<boolean> => {
        const result = await db
            .select({ id: charTable.id })
            .from(charTable)
            .where(and(eq(charTable.playerId, playerId), eq(charTable.main, true)))
            .limit(1)
        return result.length > 0
    },

    getByNameRealm: async (name: string, realm: string): Promise<Character | null> => {
        const result = await db
            .select()
            .from(charTable)
            .where(and(eq(charTable.name, name), eq(charTable.realm, realm)))
            .then((r) => r.at(0))
        return result ? mapAndParse(result, identity, characterSchema) : null
    },

    getIdMapByNameRealm: async (
        chars: { name: string; realm: string }[]
    ): Promise<Map<string, string>> => {
        if (chars.length === 0) {
            return new Map()
        }

        const condition = or(
            ...chars.map((c) =>
                and(eq(charTable.name, c.name), eq(charTable.realm, c.realm))
            )
        )
        const results = await db
            .select({ id: charTable.id, name: charTable.name, realm: charTable.realm })
            .from(charTable)
            .where(condition)

        return new Map(results.map((r) => [`${r.name}-${r.realm}`, r.id]))
    },

    assignToPlayer: async (
        characterId: string,
        targetPlayerId: string
    ): Promise<void> => {
        await db
            .update(charTable)
            .set({ playerId: targetPlayerId })
            .where(eq(charTable.id, characterId))
    },
}

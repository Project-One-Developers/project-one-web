import { eq, inArray, isNull, type SQL } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { charTable, playerTable } from "@/db/schema"
import { newUUID } from "@/db/utils"
import {
    characterSchema,
    characterWithPlayerSchema,
    playerSchema,
    type Character,
    type CharacterWithPlayer,
    type EditCharacter,
    type EditPlayer,
    type NewCharacter,
    type NewPlayer,
    type Player,
    type PlayerWithCharacters,
} from "@/shared/models/character.model"
import { wowClassNameSchema, wowRolesSchema } from "@/shared/models/wow.model"

// Player storage schema for parsing DB results
const playerStorageSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        characters: z.array(
            z.object({
                id: z.string(),
                name: z.string(),
                realm: z.string(),
                class: wowClassNameSchema,
                role: wowRolesSchema,
                main: z.boolean(),
                playerId: z.string(),
            })
        ),
    })
    .transform((data) => ({
        id: data.id,
        name: data.name,
        characters: data.characters.map((char) => ({
            id: char.id,
            name: char.name,
            realm: char.realm,
            main: char.main,
            class: char.class,
            role: char.role,
            playerId: char.playerId,
        })),
    }))

const playersListStorageSchema = z.array(playerStorageSchema)

export const playerRepo = {
    getWithCharactersList: async (): Promise<PlayerWithCharacters[]> => {
        const result = await db.query.playerTable.findMany({
            with: {
                characters: true,
            },
        })
        return playersListStorageSchema.parse(result)
    },

    getWithoutCharactersList: async (): Promise<Player[]> => {
        const result = await db
            .select({ id: playerTable.id, name: playerTable.name })
            .from(playerTable)
            .leftJoin(charTable, eq(playerTable.id, charTable.playerId))
            .where(isNull(charTable.playerId))
        return z.array(playerSchema).parse(result)
    },

    getById: async (id: string): Promise<Player | null> => {
        const result = await db
            .select()
            .from(playerTable)
            .where(eq(playerTable.id, id))
            .then((r) => r.at(0))

        if (!result) {
            return null
        }

        return playerSchema.parse(result)
    },

    add: async (player: NewPlayer): Promise<string> => {
        const id = newUUID()

        await db.insert(playerTable).values({
            id: id,
            name: player.name,
        })

        return id
    },

    edit: async (edited: EditPlayer): Promise<void> => {
        await db
            .update(playerTable)
            .set({
                name: edited.name,
            })
            .where(eq(playerTable.id, edited.id))
    },

    delete: async (id: string): Promise<void> => {
        await db.delete(charTable).where(eq(charTable.playerId, id))
        await db.delete(playerTable).where(eq(playerTable.id, id))
    },
}

export const characterRepo = {
    getWithPlayerById: async (id: string): Promise<CharacterWithPlayer | null> => {
        const result = await db.query.charTable.findFirst({
            where: (char, { eq }) => eq(char.id, id),
            with: {
                player: true,
            },
        })

        if (!result) {
            return null
        }

        return characterWithPlayerSchema.parse(result)
    },

    getWithPlayerList: async (): Promise<CharacterWithPlayer[]> => {
        const result = await db.query.charTable.findMany({
            with: {
                player: true,
            },
        })
        return z.array(characterWithPlayerSchema).parse(result)
    },

    getList: async (showMains = true, showAlts = true): Promise<Character[]> => {
        // Both false = nothing to show
        if (!showMains && !showAlts) {
            return []
        }

        // Both true = no filter needed
        const whereClause: SQL | undefined =
            showMains && showAlts ? undefined : eq(charTable.main, showMains)

        const result = await db.query.charTable.findMany({
            where: whereClause,
        })
        return z.array(characterSchema).parse(result)
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
        const result = await db.query.charTable.findMany({
            where: inArray(charTable.id, ids),
            with: { player: true },
        })
        return z.array(characterWithPlayerSchema).parse(result)
    },
}

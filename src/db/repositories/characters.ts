import { eq, inArray, isNull } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { charTable, playerTable } from "@/db/schema"
import { newUUID } from "@/db/utils"
import {
    characterSchema,
    characterWithPlayerSchema,
    playerSchema,
} from "@/shared/schemas/characters.schemas"
import { wowClassNameSchema, wowRolesSchema } from "@/shared/schemas/wow.schemas"
import type {
    Character,
    CharacterWithPlayer,
    EditCharacter,
    EditPlayer,
    NewCharacter,
    NewPlayer,
    Player,
    PlayerWithCharacters,
} from "@/shared/types/types"

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

// ============== PLAYERS ==============

export async function getPlayerWithCharactersList(): Promise<PlayerWithCharacters[]> {
    const result = await db.query.playerTable.findMany({
        with: {
            characters: true,
        },
    })
    return playersListStorageSchema.parse(result)
}

export async function getPlayersWithoutCharactersList(): Promise<Player[]> {
    const result = await db
        .select()
        .from(playerTable)
        .leftJoin(charTable, eq(playerTable.id, charTable.playerId))
        .where(isNull(charTable.playerId))
    return z.array(playerSchema).parse(result.map((row) => row.players))
}

export async function getPlayerById(id: string): Promise<Player | null> {
    const result = await db
        .select()
        .from(playerTable)
        .where(eq(playerTable.id, id))
        .then((r) => r.at(0))

    if (!result) {
        return null
    }

    return playerSchema.parse(result)
}

export async function addPlayer(player: NewPlayer): Promise<string> {
    const id = newUUID()

    await db.insert(playerTable).values({
        id: id,
        name: player.name,
    })

    return id
}

export async function editPlayer(edited: EditPlayer): Promise<void> {
    await db
        .update(playerTable)
        .set({
            name: edited.name,
        })
        .where(eq(playerTable.id, edited.id))
}

export async function deletePlayer(id: string): Promise<void> {
    await db.delete(charTable).where(eq(charTable.playerId, id))
    await db.delete(playerTable).where(eq(playerTable.id, id))
}

// ============== CHARACTERS ==============

export async function getCharacterWithPlayerById(
    id: string
): Promise<CharacterWithPlayer | null> {
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
}

export async function getCharactersWithPlayerList(): Promise<CharacterWithPlayer[]> {
    const result = await db.query.charTable.findMany({
        with: {
            player: true,
        },
    })
    return z.array(characterWithPlayerSchema).parse(result)
}

export async function getCharactersList(): Promise<Character[]> {
    const result = await db.query.charTable.findMany()
    return z.array(characterSchema).parse(result)
}

export async function addCharacter(character: NewCharacter): Promise<string> {
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
}

export async function editCharacter(edited: EditCharacter): Promise<void> {
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
}

export async function deleteCharacter(id: string): Promise<void> {
    await db.delete(charTable).where(eq(charTable.id, id))
}

export async function getCharactersByIds(ids: string[]): Promise<CharacterWithPlayer[]> {
    if (ids.length === 0) {
        return []
    }
    const result = await db.query.charTable.findMany({
        where: inArray(charTable.id, ids),
        with: { player: true },
    })
    return z.array(characterWithPlayerSchema).parse(result)
}

import { eq, isNull } from "drizzle-orm"
import { db } from "@/db"
import { charTable, playerTable } from "@/db/schema"
import { identity, mapAndParse, newUUID } from "@/db/utils"
import {
    playerSchema,
    playerWithCharacterSchema,
    type EditPlayer,
    type NewPlayer,
    type Player,
    type PlayerWithCharacters,
} from "@/shared/models/character.model"

export const playerRepo = {
    getWithCharactersList: async (): Promise<PlayerWithCharacters[]> => {
        const players = await db.select().from(playerTable)
        const characters = await db.select().from(charTable)
        const charsByPlayer = Map.groupBy(characters, (c) => c.playerId)

        return mapAndParse(
            players,
            (player) => ({ ...player, characters: charsByPlayer.get(player.id) ?? [] }),
            playerWithCharacterSchema
        )
    },

    getWithoutCharactersList: async (): Promise<Player[]> => {
        const result = await db
            .select({ id: playerTable.id, name: playerTable.name })
            .from(playerTable)
            .leftJoin(charTable, eq(playerTable.id, charTable.playerId))
            .where(isNull(charTable.playerId))
        return mapAndParse(result, identity, playerSchema)
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

        return mapAndParse(result, identity, playerSchema)
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
        await db.delete(playerTable).where(eq(playerTable.id, id))
    },
}

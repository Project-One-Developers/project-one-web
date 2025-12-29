import { eq, isNull, type InferSelectModel } from "drizzle-orm"
import { db } from "@/db"
import { charTable, playerTable } from "@/db/schema"
import { identity, mapAndParse, newUUID } from "@/db/utils"
import {
    characterSchema,
    playerSchema,
    playerWithCharacterSchema,
    type EditPlayer,
    type NewPlayer,
    type Player,
    type PlayerWithCharacters,
} from "@/shared/models/character.model"

// DB type definitions for type-safe mapping
type DbPlayer = InferSelectModel<typeof playerTable>
type DbCharacter = InferSelectModel<typeof charTable>
type DbPlayerWithChars = DbPlayer & { characters: DbCharacter[] }

function mapDbToPlayerWithCharacters(db: DbPlayerWithChars): PlayerWithCharacters {
    return {
        ...mapAndParse(db, identity<DbPlayer>, playerSchema),
        characters: mapAndParse(db.characters, identity<DbCharacter>, characterSchema),
    }
}

export const playerRepo = {
    getWithCharactersList: async (): Promise<PlayerWithCharacters[]> => {
        const result = await db.query.playerTable.findMany({
            with: {
                characters: true,
            },
        })
        return mapAndParse(result, mapDbToPlayerWithCharacters, playerWithCharacterSchema)
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

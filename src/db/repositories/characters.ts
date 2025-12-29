import { eq, inArray, isNull, type InferSelectModel, type SQL } from "drizzle-orm"
import { db } from "@/db"
import { charTable, playerTable } from "@/db/schema"
import { mapAndParse, newUUID } from "@/db/utils"
import {
    characterSchema,
    characterWithPlayerSchema,
    playerSchema,
    playerWithCharacterSchema,
    type Character,
    type CharacterWithPlayer,
    type EditCharacter,
    type EditPlayer,
    type NewCharacter,
    type NewPlayer,
    type Player,
    type PlayerWithCharacters,
} from "@/shared/models/character.model"

// DB type definitions for type-safe mapping
type DbPlayer = InferSelectModel<typeof playerTable>
type DbCharacter = InferSelectModel<typeof charTable>
type DbPlayerWithChars = DbPlayer & { characters: DbCharacter[] }
type DbCharacterWithPlayer = DbCharacter & { player: DbPlayer }

// Mapper functions
function mapDbToCharacter(db: DbCharacter): Character {
    return {
        id: db.id,
        name: db.name,
        realm: db.realm,
        class: db.class,
        role: db.role,
        main: db.main,
        playerId: db.playerId,
    }
}

function mapDbToPlayer(db: DbPlayer): Player {
    return {
        id: db.id,
        name: db.name,
    }
}

function mapDbToPlayerWithCharacters(db: DbPlayerWithChars): PlayerWithCharacters {
    return {
        id: db.id,
        name: db.name,
        characters: db.characters.map(mapDbToCharacter),
    }
}

function mapDbToCharacterWithPlayer(db: DbCharacterWithPlayer): CharacterWithPlayer {
    return {
        ...mapDbToCharacter(db),
        player: mapDbToPlayer(db.player),
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
        return mapAndParse(result, mapDbToPlayer, playerSchema)
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

        return mapAndParse(result, mapDbToPlayer, playerSchema)
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

        return mapAndParse(result, mapDbToCharacterWithPlayer, characterWithPlayerSchema)
    },

    getWithPlayerList: async (): Promise<CharacterWithPlayer[]> => {
        const result = await db.query.charTable.findMany({
            with: {
                player: true,
            },
        })
        return mapAndParse(result, mapDbToCharacterWithPlayer, characterWithPlayerSchema)
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
        return mapAndParse(result, mapDbToCharacter, characterSchema)
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
        return mapAndParse(result, mapDbToCharacterWithPlayer, characterWithPlayerSchema)
    },
}

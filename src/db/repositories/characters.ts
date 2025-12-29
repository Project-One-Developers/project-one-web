import { eq, inArray, type InferSelectModel, type SQL } from "drizzle-orm"
import { db } from "@/db"
import { charTable, playerTable } from "@/db/schema"
import { identity, mapAndParse, newUUID } from "@/db/utils"
import {
    characterSchema,
    characterWithPlayerSchema,
    playerSchema,
    type Character,
    type CharacterWithPlayer,
    type EditCharacter,
    type NewCharacter,
} from "@/shared/models/character.model"

// DB type definitions for type-safe mapping
type DbPlayer = InferSelectModel<typeof playerTable>
type DbCharacter = InferSelectModel<typeof charTable>
type DbCharacterWithPlayer = DbCharacter & { player: DbPlayer }

function mapDbToCharacterWithPlayer(db: DbCharacterWithPlayer): CharacterWithPlayer {
    return {
        ...mapAndParse(db, identity<DbCharacter>, characterSchema),
        player: mapAndParse(db.player, identity<DbPlayer>, playerSchema),
    }
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
        const result = await db.query.charTable.findMany({
            where: inArray(charTable.id, ids),
            with: { player: true },
        })
        return mapAndParse(result, mapDbToCharacterWithPlayer, characterWithPlayerSchema)
    },
}

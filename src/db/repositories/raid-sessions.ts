import { count, desc, eq, type InferInsertModel, sql } from "drizzle-orm"
import { db } from "@/db"
import {
    charTable,
    lootTable,
    playerTable,
    raidSessionRosterTable,
    raidSessionTable,
} from "@/db/schema"
import { identity, mapAndParse, newUUID } from "@/db/utils"
import { characterSchema, type Character } from "@/shared/models/character.model"
import {
    raidSessionSchema,
    raidSessionWithRosterSchema,
    raidSessionWithSummarySchema,
    type EditRaidSession,
    type NewRaidSession,
    type RaidSession,
    type RaidSessionWithRoster,
    type RaidSessionWithSummary,
} from "@/shared/models/raid-session.model"

export const raidSessionRepo = {
    getWithRoster: async (id: string): Promise<RaidSessionWithRoster> => {
        // Fetch the raid session
        const session = await db
            .select()
            .from(raidSessionTable)
            .where(eq(raidSessionTable.id, id))
            .then((r) => r.at(0))

        if (!session) {
            throw new Error(`Raid session not found: ${id}`)
        }

        const rosterData = await db
            .select({ character: charTable, player: playerTable })
            .from(raidSessionRosterTable)
            .innerJoin(charTable, eq(raidSessionRosterTable.charId, charTable.id))
            .innerJoin(playerTable, eq(charTable.playerId, playerTable.id))
            .where(eq(raidSessionRosterTable.raidSessionId, id))

        const roster = rosterData.map((r) => ({ ...r.character, player: r.player }))
        return mapAndParse({ ...session, roster }, identity, raidSessionWithRosterSchema)
    },

    getById: async (id: string): Promise<RaidSession> => {
        const result = await db
            .select()
            .from(raidSessionTable)
            .where(eq(raidSessionTable.id, id))
            .then((r) => r.at(0))

        if (!result) {
            throw new Error(`Raid session not found: ${id}`)
        }

        return mapAndParse(result, identity, raidSessionSchema)
    },

    getAll: async (): Promise<RaidSession[]> => {
        const result = await db.select().from(raidSessionTable)
        return mapAndParse(result, identity, raidSessionSchema)
    },

    getWithSummaryList: async (): Promise<RaidSessionWithSummary[]> => {
        // Single query with correlated subqueries instead of N+1
        const lootCountSq = db
            .select({ value: count() })
            .from(lootTable)
            .where(eq(lootTable.raidSessionId, raidSessionTable.id))

        const rosterCountSq = db
            .select({ value: count() })
            .from(raidSessionRosterTable)
            .where(eq(raidSessionRosterTable.raidSessionId, raidSessionTable.id))

        const results = await db
            .select({
                id: raidSessionTable.id,
                name: raidSessionTable.name,
                raidDate: raidSessionTable.raidDate,
                lootCount: sql<number>`(${lootCountSq})`,
                rosterCount: sql<number>`(${rosterCountSq})`,
            })
            .from(raidSessionTable)
            .orderBy(desc(raidSessionTable.raidDate))

        return mapAndParse(
            results,
            (r) => ({
                id: r.id,
                name: r.name,
                raidDate: r.raidDate,
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion -- PostgreSQL bigint comes as string
                lootCount: Number(r.lootCount),
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion -- PostgreSQL bigint comes as string
                rosterCount: Number(r.rosterCount),
            }),
            raidSessionWithSummarySchema
        )
    },

    edit: async (editedRaidSession: EditRaidSession): Promise<string> => {
        // Update session
        await db
            .update(raidSessionTable)
            .set({
                name: editedRaidSession.name,
                raidDate: editedRaidSession.raidDate,
            })
            .where(eq(raidSessionTable.id, editedRaidSession.id))

        // Delete old roster
        await db
            .delete(raidSessionRosterTable)
            .where(eq(raidSessionRosterTable.raidSessionId, editedRaidSession.id))

        // Insert updated roster
        if (editedRaidSession.roster.length > 0) {
            const raidPartecipation = editedRaidSession.roster.map(
                (characterId): InferInsertModel<typeof raidSessionRosterTable> => ({
                    raidSessionId: editedRaidSession.id,
                    charId: characterId,
                })
            )
            await db.insert(raidSessionRosterTable).values(raidPartecipation)
        }

        return editedRaidSession.id
    },

    add: async (newRaidSession: NewRaidSession): Promise<string> => {
        const res = await db
            .insert(raidSessionTable)
            .values({
                id: newUUID(),
                name: newRaidSession.name,
                raidDate: newRaidSession.raidDate,
            })
            .returning({ id: raidSessionTable.id })
            .then((r) => r.at(0))

        if (!res) {
            throw new Error(
                `Failed to insert raid session: ${JSON.stringify(newRaidSession)}`
            )
        }

        if (newRaidSession.roster.length > 0) {
            const raidPartecipation = newRaidSession.roster.map(
                (characterId): InferInsertModel<typeof raidSessionRosterTable> => ({
                    raidSessionId: res.id,
                    charId: characterId,
                })
            )
            await db.insert(raidSessionRosterTable).values(raidPartecipation)
        }

        return res.id
    },

    delete: async (id: string): Promise<void> => {
        await db.delete(raidSessionTable).where(eq(raidSessionTable.id, id))
    },

    getRoster: async (id: string): Promise<Character[]> => {
        const result = await db
            .select({ character: charTable })
            .from(raidSessionRosterTable)
            .innerJoin(charTable, eq(raidSessionRosterTable.charId, charTable.id))
            .where(eq(raidSessionRosterTable.raidSessionId, id))

        return mapAndParse(result, (r) => r.character, characterSchema)
    },
}

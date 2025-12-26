import { count, desc, eq, InferInsertModel, sql } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import {
    charTable,
    lootTable,
    raidSessionRosterTable,
    raidSessionTable,
} from "@/db/schema"
import { newUUID } from "@/db/utils"
import { characterSchema } from "@/shared/schemas/characters.schemas"
import {
    raidSessionSchema,
    raidSessionWithRosterSchema,
    raidSessionWithSummarySchema,
} from "@/shared/schemas/raid.schemas"
import type {
    Character,
    EditRaidSession,
    NewRaidSession,
    RaidSession,
    RaidSessionWithRoster,
    RaidSessionWithSummary,
} from "@/shared/types/types"

type RaidSessionWithCharPartecipation = RaidSession & {
    charPartecipation?: { character: Character }[]
}

function flattenRaidPartecipation(
    result: RaidSessionWithCharPartecipation
): RaidSessionWithRoster {
    return {
        ...result,
        roster: result.charPartecipation?.map((cp) => cp.character) ?? [],
    }
}

export async function getRaidSessionWithRoster(
    id: string
): Promise<RaidSessionWithRoster> {
    const result = await db.query.raidSessionTable.findFirst({
        where: (raidSessionTable, { eq }) => eq(raidSessionTable.id, id),
        with: {
            charPartecipation: {
                with: {
                    character: {
                        with: { player: true },
                    },
                },
            },
        },
    })

    if (!result) {
        throw new Error(`Raid session not found: ${id}`)
    }
    const processedResult = flattenRaidPartecipation(result)
    return raidSessionWithRosterSchema.parse(processedResult)
}

export async function getRaidSession(id: string): Promise<RaidSession> {
    const result = await db.query.raidSessionTable.findFirst({
        where: (raidSessionTable, { eq }) => eq(raidSessionTable.id, id),
    })
    return raidSessionSchema.parse(result)
}

export async function getRaidSessions(): Promise<RaidSession[]> {
    const result = await db.query.raidSessionTable.findMany()
    return z.array(raidSessionSchema).parse(result)
}

export async function getRaidSessionWithSummaryList(): Promise<RaidSessionWithSummary[]> {
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

    const parsed = results.map((r) => ({
        id: r.id,
        name: r.name,
        raidDate: r.raidDate,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion -- PostgreSQL bigint comes as string
        lootCount: Number(r.lootCount),
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion -- PostgreSQL bigint comes as string
        rosterCount: Number(r.rosterCount),
    }))

    return z.array(raidSessionWithSummarySchema).parse(parsed)
}

export async function editRaidSession(
    editedRaidSession: EditRaidSession
): Promise<string> {
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
}

export async function addRaidSession(newRaidSession: NewRaidSession): Promise<string> {
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
}

export async function deleteRaidSession(id: string): Promise<void> {
    await db.delete(raidSessionTable).where(eq(raidSessionTable.id, id))
}

export async function getRaidSessionRoster(id: string): Promise<Character[]> {
    const result = await db
        .select()
        .from(raidSessionRosterTable)
        .innerJoin(charTable, eq(raidSessionRosterTable.charId, charTable.id))
        .where(eq(raidSessionRosterTable.raidSessionId, id))

    return z.array(characterSchema).parse(result.flatMap((sr) => sr.characters))
}

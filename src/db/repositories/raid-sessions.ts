import { db } from '@/db'
import { charTable, lootTable, raidSessionRosterTable, raidSessionTable } from '@/db/schema'
import { newUUID, takeFirstResult } from '@/db/utils'
import { characterSchema } from '@/shared/schemas/characters.schemas'
import {
    raidSessionSchema,
    raidSessionWithRosterSchema,
    raidSessionWithSummarySchema
} from '@/shared/schemas/raid.schemas'
import type {
    Character,
    EditRaidSession,
    NewRaidSession,
    RaidSession,
    RaidSessionWithRoster,
    RaidSessionWithSummary
} from '@/shared/types/types'
import { count, eq, InferInsertModel } from 'drizzle-orm'
import { z } from 'zod'

function flattenRaidPartecipation(result: any): RaidSessionWithRoster {
    return {
        ...result,
        roster: result?.charPartecipation?.map((cp: any) => cp.character) ?? []
    }
}

export async function getRaidSessionWithRoster(id: string): Promise<RaidSessionWithRoster> {
    const result = await db.query.raidSessionTable.findFirst({
        where: (raidSessionTable, { eq }) => eq(raidSessionTable.id, id),
        with: {
            charPartecipation: {
                with: {
                    character: {
                        with: { player: true }
                    }
                }
            }
        }
    })

    const processedResult = flattenRaidPartecipation(result)
    return raidSessionWithRosterSchema.parse(processedResult)
}

export async function getRaidSession(id: string): Promise<RaidSession> {
    const result = await db.query.raidSessionTable.findFirst({
        where: (raidSessionTable, { eq }) => eq(raidSessionTable.id, id)
    })
    return raidSessionSchema.parse(result)
}

export async function getRaidSessions(): Promise<RaidSession[]> {
    const result = await db.query.raidSessionTable.findMany()
    return z.array(raidSessionSchema).parse(result)
}

async function countLoot(id: string): Promise<number> {
    const res = await db
        .select({ count: count() })
        .from(lootTable)
        .where(eq(lootTable.raidSessionId, id))
    return res.at(0)?.count ?? 0
}

async function countRoster(id: string): Promise<number> {
    const res = await db
        .select({ count: count() })
        .from(raidSessionRosterTable)
        .where(eq(raidSessionRosterTable.raidSessionId, id))
    return res.at(0)?.count ?? 0
}

export async function getRaidSessionWithSummaryList(): Promise<RaidSessionWithSummary[]> {
    const sessions = await getRaidSessions()

    const allPromise = sessions.map(async s => {
        const [lootCount, rosterCount] = await Promise.all([countLoot(s.id), countRoster(s.id)])
        return {
            ...s,
            rosterCount: rosterCount,
            lootCount: lootCount
        }
    })

    const result = await Promise.all(allPromise)
    return z.array(raidSessionWithSummarySchema).parse(result)
}

export async function editRaidSession(editedRaidSession: EditRaidSession): Promise<string> {
    // Update session
    await db
        .update(raidSessionTable)
        .set({
            name: editedRaidSession.name,
            raidDate: editedRaidSession.raidDate
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
                charId: characterId
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
            raidDate: newRaidSession.raidDate
        })
        .returning({ id: raidSessionTable.id })
        .then(takeFirstResult)

    if (!res) {
        throw new Error(`Failed to insert raid session: ${JSON.stringify(newRaidSession)}`)
    }

    if (newRaidSession.roster.length > 0) {
        const raidPartecipation = newRaidSession.roster.map(
            (characterId): InferInsertModel<typeof raidSessionRosterTable> => ({
                raidSessionId: res.id,
                charId: characterId
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

    return z.array(characterSchema).parse(result.flatMap(sr => sr.characters))
}

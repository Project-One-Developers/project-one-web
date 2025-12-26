"use server"

import { getCharactersList } from "@/db/repositories/characters"
import {
    addRaidSession,
    deleteRaidSession,
    editRaidSession,
    getRaidSession,
    getRaidSessionRoster,
    getRaidSessionWithRoster,
    getRaidSessionWithSummaryList,
} from "@/db/repositories/raid-sessions"
import { newUUID } from "@/db/utils"
import { getUnixTimestamp } from "@/shared/libs/date/date-utils"
import type {
    Character,
    EditRaidSession,
    NewRaidSession,
    RaidSession,
    RaidSessionWithRoster,
    RaidSessionWithSummary,
} from "@/shared/types/types"

export async function getRaidSessionWithRosterAction(
    id: string
): Promise<RaidSessionWithRoster> {
    return await getRaidSessionWithRoster(id)
}

export async function getRaidSessionWithSummaryListAction(): Promise<
    RaidSessionWithSummary[]
> {
    return await getRaidSessionWithSummaryList()
}

export async function addRaidSessionAction(
    raidSession: NewRaidSession
): Promise<RaidSession> {
    const id = await addRaidSession(raidSession)
    return await getRaidSession(id)
}

export async function editRaidSessionAction(
    editedRaidSession: EditRaidSession
): Promise<RaidSession> {
    await editRaidSession(editedRaidSession)
    return await getRaidSession(editedRaidSession.id)
}

export async function deleteRaidSessionAction(id: string): Promise<void> {
    await deleteRaidSession(id)
}

export async function cloneRaidSessionAction(id: string): Promise<RaidSession> {
    const source = await getRaidSessionWithRoster(id)
    const cloned: NewRaidSession = {
        name: `${source.name}-${newUUID().slice(0, 6)}`,
        raidDate: getUnixTimestamp(),
        roster: source.roster.map((r) => r.id),
    }
    const newId = await addRaidSession(cloned)
    return await getRaidSession(newId)
}

export async function importRosterInRaidSessionAction(
    raidSessionId: string,
    csv: string
): Promise<void> {
    const source = await getRaidSession(raidSessionId)
    const allCharacters = await getCharactersList()

    // Parse CSV: each line is a character name-server or character name
    const roster: Character[] = csv
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
            const [name] = line.split("-")
            const matches = allCharacters.filter((r) => r.name === name)

            if (matches.length === 0) {
                return undefined
            } else if (matches.length === 1) {
                return matches[0]
            } else {
                // Multiple matches, prefer main
                return matches.find((r) => r.main)
            }
        })
        .filter((r): r is Character => r !== undefined)

    const editedRaidSession: EditRaidSession = {
        ...source,
        roster: roster.map((r) => r.id),
    }

    await editRaidSession(editedRaidSession)
}

export async function getRaidSessionRosterAction(id: string): Promise<Character[]> {
    return await getRaidSessionRoster(id)
}

"use server"

import { characterRepo } from "@/db/repositories/characters"
import { raidSessionRepo } from "@/db/repositories/raid-sessions"
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

export async function getRaidSessionWithRoster(
    id: string
): Promise<RaidSessionWithRoster> {
    return await raidSessionRepo.getWithRoster(id)
}

export async function getRaidSessionWithSummaryList(): Promise<RaidSessionWithSummary[]> {
    return await raidSessionRepo.getWithSummaryList()
}

export async function addRaidSession(raidSession: NewRaidSession): Promise<RaidSession> {
    const id = await raidSessionRepo.add(raidSession)
    return await raidSessionRepo.getById(id)
}

export async function editRaidSession(
    editedRaidSession: EditRaidSession
): Promise<RaidSession> {
    await raidSessionRepo.edit(editedRaidSession)
    return await raidSessionRepo.getById(editedRaidSession.id)
}

export async function deleteRaidSession(id: string): Promise<void> {
    await raidSessionRepo.delete(id)
}

export async function cloneRaidSession(id: string): Promise<RaidSession> {
    const source = await raidSessionRepo.getWithRoster(id)
    const cloned: NewRaidSession = {
        name: `${source.name}-${newUUID().slice(0, 6)}`,
        raidDate: getUnixTimestamp(),
        roster: source.roster.map((r) => r.id),
    }
    const newId = await raidSessionRepo.add(cloned)
    return await raidSessionRepo.getById(newId)
}

export async function importRosterInRaidSession(
    raidSessionId: string,
    csv: string
): Promise<void> {
    const source = await raidSessionRepo.getById(raidSessionId)
    const allCharacters = await characterRepo.getList()

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

    await raidSessionRepo.edit(editedRaidSession)
}

export async function getRaidSessionRoster(id: string): Promise<Character[]> {
    return await raidSessionRepo.getRoster(id)
}

"use server"

import { characterRepo } from "@/db/repositories/characters"
import { raidSessionRepo } from "@/db/repositories/raid-sessions"
import { newUUID } from "@/db/utils"
import { tryCatch, tryCatchVoid } from "@/lib/result"
import { getUnixTimestamp } from "@/shared/libs/date/date-utils"
import type { Character } from "@/shared/models/character.model"
import type {
    EditRaidSession,
    NewRaidSession,
    RaidSession,
    RaidSessionWithRoster,
    RaidSessionWithSummary,
} from "@/shared/models/raid-session.model"
import type { Result, VoidResult } from "@/shared/types/types"

export async function getRaidSessionWithRoster(
    id: string
): Promise<RaidSessionWithRoster> {
    return await raidSessionRepo.getWithRoster(id)
}

export async function getRaidSessionWithSummaryList(): Promise<RaidSessionWithSummary[]> {
    return await raidSessionRepo.getWithSummaryList()
}

export async function addRaidSession(
    raidSession: NewRaidSession
): Promise<Result<RaidSession>> {
    return tryCatch(async () => {
        const id = await raidSessionRepo.add(raidSession)
        return await raidSessionRepo.getById(id)
    }, "RaidSessions")
}

export async function editRaidSession(
    editedRaidSession: EditRaidSession
): Promise<Result<RaidSession>> {
    return tryCatch(async () => {
        await raidSessionRepo.edit(editedRaidSession)
        return await raidSessionRepo.getById(editedRaidSession.id)
    }, "RaidSessions")
}

export async function deleteRaidSession(id: string): Promise<VoidResult> {
    return tryCatchVoid(
        () => raidSessionRepo.delete(id),
        "RaidSessions",
        "Failed to delete raid session"
    )
}

export async function cloneRaidSession(id: string): Promise<Result<RaidSession>> {
    return tryCatch(async () => {
        const source = await raidSessionRepo.getWithRoster(id)
        const cloned: NewRaidSession = {
            name: `${source.name}-${newUUID().slice(0, 6)}`,
            raidDate: getUnixTimestamp(),
            roster: source.roster.map((r) => r.id),
        }
        const newId = await raidSessionRepo.add(cloned)
        return await raidSessionRepo.getById(newId)
    }, "RaidSessions")
}

export async function importRosterInRaidSession(
    raidSessionId: string,
    csv: string
): Promise<VoidResult> {
    return tryCatchVoid(async () => {
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
    }, "RaidSessions")
}

export async function getRaidSessionRoster(id: string): Promise<Character[]> {
    return await raidSessionRepo.getRoster(id)
}

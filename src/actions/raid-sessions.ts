"use server"

import { z } from "zod"
import { characterRepo } from "@/db/repositories/characters"
import { raidSessionRepo } from "@/db/repositories/raid-sessions"
import { newUUID } from "@/db/utils"
import { authActionClient } from "@/lib/safe-action"
import { getUnixTimestamp } from "@/shared/libs/date/date-utils"
import type { Character } from "@/shared/models/character.model"
import {
    editRaidSessionSchema,
    newRaidSessionSchema,
    type RaidSessionWithRoster,
    type RaidSessionWithSummary,
} from "@/shared/models/raid-session.model"

export async function getRaidSessionWithRoster(
    id: string
): Promise<RaidSessionWithRoster> {
    return await raidSessionRepo.getWithRoster(id)
}

export async function getRaidSessionWithSummaryList(): Promise<RaidSessionWithSummary[]> {
    return await raidSessionRepo.getWithSummaryList()
}

export const addRaidSession = authActionClient
    .inputSchema(newRaidSessionSchema)
    .action(async ({ parsedInput }) => {
        const id = await raidSessionRepo.add(parsedInput)
        return await raidSessionRepo.getById(id)
    })

export const editRaidSession = authActionClient
    .inputSchema(editRaidSessionSchema)
    .action(async ({ parsedInput }) => {
        await raidSessionRepo.edit(parsedInput)
        return await raidSessionRepo.getById(parsedInput.id)
    })

export const deleteRaidSession = authActionClient
    .inputSchema(z.object({ id: z.uuid() }))
    .action(async ({ parsedInput }) => {
        await raidSessionRepo.delete(parsedInput.id)
    })

export const cloneRaidSession = authActionClient
    .inputSchema(z.object({ id: z.uuid() }))
    .action(async ({ parsedInput }) => {
        const source = await raidSessionRepo.getWithRoster(parsedInput.id)
        const cloned = {
            name: `${source.name}-${newUUID().slice(0, 6)}`,
            raidDate: getUnixTimestamp(),
            roster: source.roster.map((r) => r.id),
        }
        const newId = await raidSessionRepo.add(cloned)
        return await raidSessionRepo.getById(newId)
    })

export const importRosterInRaidSession = authActionClient
    .inputSchema(z.object({ raidSessionId: z.uuid(), csv: z.string() }))
    .action(async ({ parsedInput }) => {
        const source = await raidSessionRepo.getById(parsedInput.raidSessionId)
        const allCharacters = await characterRepo.getList()

        // Parse CSV: each line is a character name-server or character name
        const roster: Character[] = parsedInput.csv
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

        const editedRaidSession = {
            ...source,
            roster: roster.map((r) => r.id),
        }

        await raidSessionRepo.edit(editedRaidSession)
    })

export async function getRaidSessionRoster(id: string): Promise<Character[]> {
    return await raidSessionRepo.getRoster(id)
}

import "server-only"
import { characterRepo } from "@/db/repositories/characters"
import { raidSessionRepo } from "@/db/repositories/raid-sessions"
import { newUUID } from "@/db/utils"
import { getUnixTimestamp } from "@/shared/libs/date-utils"
import type { Character } from "@/shared/models/character.models"
import type {
    EditRaidSession,
    NewRaidSession,
    RaidSession,
    RaidSessionWithRoster,
    RaidSessionWithSummary,
} from "@/shared/models/raid-session.models"

export const raidSessionService = {
    getById: async (id: string): Promise<RaidSession> => {
        return raidSessionRepo.getById(id)
    },

    getWithRoster: async (id: string): Promise<RaidSessionWithRoster> => {
        return raidSessionRepo.getWithRoster(id)
    },

    getWithSummaryList: async (): Promise<RaidSessionWithSummary[]> => {
        return raidSessionRepo.getWithSummaryList()
    },

    add: async (raidSession: NewRaidSession): Promise<RaidSession> => {
        const id = await raidSessionRepo.add(raidSession)
        return raidSessionRepo.getById(id)
    },

    edit: async (editedRaidSession: EditRaidSession): Promise<RaidSession> => {
        await raidSessionRepo.edit(editedRaidSession)
        return raidSessionRepo.getById(editedRaidSession.id)
    },

    delete: async (id: string): Promise<void> => {
        await raidSessionRepo.delete(id)
    },

    clone: async (id: string): Promise<RaidSession> => {
        const source = await raidSessionRepo.getWithRoster(id)
        const cloned: NewRaidSession = {
            name: `${source.name}-${newUUID().slice(0, 6)}`,
            raidDate: getUnixTimestamp(),
            roster: source.roster.map((r) => r.id),
        }
        const newId = await raidSessionRepo.add(cloned)
        return raidSessionRepo.getById(newId)
    },

    importRoster: async (raidSessionId: string, csv: string): Promise<void> => {
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
    },
}

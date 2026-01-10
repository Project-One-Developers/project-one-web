"use server"

import { safeAction } from "@/lib/errors/action-wrapper"
import { raidSessionService } from "@/services/raid-session.service"
import type {
    EditRaidSession,
    NewRaidSession,
    RaidSession,
    RaidSessionWithRoster,
    RaidSessionWithSummary,
} from "@/shared/models/raid-session.models"

export const getRaidSessionWithRoster = safeAction(
    async (id: string): Promise<RaidSessionWithRoster> => {
        return raidSessionService.getWithRoster(id)
    }
)

export const getRaidSessionWithSummaryList = safeAction(
    async (): Promise<RaidSessionWithSummary[]> => {
        return raidSessionService.getWithSummaryList()
    }
)

export const addRaidSession = safeAction(
    async (raidSession: NewRaidSession): Promise<RaidSession> => {
        return raidSessionService.add(raidSession)
    }
)

export const editRaidSession = safeAction(
    async (editedRaidSession: EditRaidSession): Promise<RaidSession> => {
        return raidSessionService.edit(editedRaidSession)
    }
)

export const deleteRaidSession = safeAction(async (id: string): Promise<void> => {
    return raidSessionService.delete(id)
})

export const cloneRaidSession = safeAction(async (id: string): Promise<RaidSession> => {
    return raidSessionService.clone(id)
})

export const importRosterInRaidSession = safeAction(
    async (raidSessionId: string, csv: string): Promise<void> => {
        return raidSessionService.importRoster(raidSessionId, csv)
    }
)

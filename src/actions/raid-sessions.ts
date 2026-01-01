"use server"

import { raidSessionService } from "@/services/raid-session.service"
import type { Character } from "@/shared/models/character.models"
import type {
    EditRaidSession,
    NewRaidSession,
    RaidSession,
    RaidSessionWithRoster,
    RaidSessionWithSummary,
} from "@/shared/models/raid-session.models"

export async function getRaidSessionWithRoster(
    id: string
): Promise<RaidSessionWithRoster> {
    return raidSessionService.getWithRoster(id)
}

export async function getRaidSessionWithSummaryList(): Promise<RaidSessionWithSummary[]> {
    return raidSessionService.getWithSummaryList()
}

export async function addRaidSession(raidSession: NewRaidSession): Promise<RaidSession> {
    return raidSessionService.add(raidSession)
}

export async function editRaidSession(
    editedRaidSession: EditRaidSession
): Promise<RaidSession> {
    return raidSessionService.edit(editedRaidSession)
}

export async function deleteRaidSession(id: string): Promise<void> {
    return raidSessionService.delete(id)
}

export async function cloneRaidSession(id: string): Promise<RaidSession> {
    return raidSessionService.clone(id)
}

export async function importRosterInRaidSession(
    raidSessionId: string,
    csv: string
): Promise<void> {
    return raidSessionService.importRoster(raidSessionId, csv)
}

export async function getRaidSessionRoster(id: string): Promise<Character[]> {
    return raidSessionService.getRoster(id)
}

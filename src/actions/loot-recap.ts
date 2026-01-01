"use server"

import { lootRecapService } from "@/services/loot-recap.service"

export async function getRaidSessionsForRecap() {
    return lootRecapService.getSessionsWithSummary()
}

export async function getLootRecapBySession(sessionId: string) {
    return lootRecapService.getRecapBySession(sessionId)
}

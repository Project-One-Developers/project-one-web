"use server"

import { safeAction } from "@/lib/errors/action-wrapper"
import { lootRecapService } from "@/services/loot-recap.service"

export const getRaidSessionsForRecap = safeAction(async () => {
    return lootRecapService.getSessionsWithSummary()
})

export const getLootRecapBySession = safeAction(async (sessionId: string) => {
    return lootRecapService.getRecapBySession(sessionId)
})

"use server"

import { safeAction } from "@/lib/errors/action-wrapper"
import { summaryService } from "@/services/summary.service"
import type { CharacterSummary, PlayerWithSummaryCompact } from "@/shared/types"

export const getRosterSummary = safeAction(async (): Promise<CharacterSummary[]> => {
    return summaryService.getRosterSummary()
})

export const getPlayersWithSummaryCompact = safeAction(
    async (): Promise<PlayerWithSummaryCompact[]> => {
        return summaryService.getPlayersWithSummaryCompact()
    }
)

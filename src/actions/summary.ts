"use server"

import { summaryService } from "@/services/summary/summary.service"
import type { CharacterSummary, PlayerWithSummaryCompact } from "@/shared/types/types"

export async function getRosterSummary(): Promise<CharacterSummary[]> {
    return summaryService.getRosterSummary()
}

export async function getPlayersWithSummaryCompact(): Promise<
    PlayerWithSummaryCompact[]
> {
    return summaryService.getPlayersWithSummaryCompact()
}

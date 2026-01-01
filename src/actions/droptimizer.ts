"use server"

import { droptimizerService } from "@/services/droptimizer.service"
import type { Droptimizer, NewDroptimizer, SimC } from "@/shared/models/simulation.models"
import type { WowRaidDifficulty } from "@/shared/models/wow.models"

type DurationInput = { days?: number; hours?: number }

export async function getDroptimizerList(): Promise<Droptimizer[]> {
    return droptimizerService.getList()
}

export async function getDroptimizerLatestList(): Promise<Droptimizer[]> {
    return droptimizerService.getLatestList()
}

export async function deleteDroptimizer(id: string): Promise<void> {
    return droptimizerService.delete(id)
}

export async function getDroptimizerByCharacterIdAndDiff(
    characterId: string,
    raidDiff: WowRaidDifficulty
): Promise<Droptimizer | null> {
    return droptimizerService.getByCharacterIdAndDiff(characterId, raidDiff)
}

export async function addDroptimizer(
    droptimizer: NewDroptimizer,
    characterId: string
): Promise<Droptimizer> {
    return droptimizerService.add(droptimizer, characterId)
}

export async function deleteSimulationsOlderThan(lookback: DurationInput): Promise<void> {
    return droptimizerService.deleteOlderThan(lookback)
}

export async function addSimC(simcData: string): Promise<SimC> {
    return droptimizerService.addSimC(simcData)
}

export async function addSimulationFromUrl(url: string): Promise<Droptimizer[]> {
    return droptimizerService.addFromUrl(url)
}

export async function syncDroptimizersFromDiscord(
    lookback: DurationInput
): Promise<{ imported: number; errors: string[] }> {
    return droptimizerService.syncFromDiscord(lookback)
}

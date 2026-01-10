"use server"

import { safeAction } from "@/lib/errors/action-wrapper"
import { droptimizerService } from "@/services/droptimizer.service"
import type { Droptimizer, SimC } from "@/shared/models/simulation.models"

type DurationInput = { days?: number; hours?: number }

export const getDroptimizerLatestList = safeAction(async (): Promise<Droptimizer[]> => {
    return droptimizerService.getLatestList()
})

export const deleteDroptimizer = safeAction(async (id: string): Promise<void> => {
    return droptimizerService.delete(id)
})

export const deleteSimulationsOlderThan = safeAction(
    async (lookback: DurationInput): Promise<void> => {
        return droptimizerService.deleteOlderThan(lookback)
    }
)

export const addSimC = safeAction(async (simcData: string): Promise<SimC> => {
    return droptimizerService.addSimC(simcData)
})

export const addSimulationFromUrl = safeAction(
    async (url: string): Promise<Droptimizer[]> => {
        return droptimizerService.addFromUrl(url)
    }
)

export const syncDroptimizersFromDiscord = safeAction(
    async (
        lookback: DurationInput
    ): Promise<{ imported: number; skipped: number; errors: string[] }> => {
        return droptimizerService.syncFromDiscord(lookback)
    }
)

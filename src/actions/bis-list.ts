"use server"

import { bisListRepo } from "@/db/repositories/bis-list"
import { safeAction } from "@/lib/errors/action-wrapper"
import type { BisList } from "@/shared/models/bis-list.models"

export const getBisList = safeAction(async (): Promise<BisList[]> => {
    return bisListRepo.getAll()
})

export const updateItemBisSpec = safeAction(
    async (itemId: number, specIds: number[]): Promise<void> => {
        await bisListRepo.updateItemBisSpec(itemId, specIds)
    }
)

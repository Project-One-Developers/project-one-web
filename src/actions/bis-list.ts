"use server"

import { bisListRepo } from "@/db/repositories/bis-list"
import type { BisList } from "@/shared/models/bis-list.model"

export async function getBisList(): Promise<BisList[]> {
    return await bisListRepo.getAll()
}

export async function updateItemBisSpec(
    itemId: number,
    specIds: number[]
): Promise<void> {
    await bisListRepo.updateItemBisSpec(itemId, specIds)
}

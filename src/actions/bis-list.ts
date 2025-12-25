"use server"

import { getBisList, updateItemBisSpec } from "@/db/repositories/bis-list"
import type { BisList } from "@/shared/types/types"

export async function getBisListAction(): Promise<BisList[]> {
    return await getBisList()
}

export async function updateItemBisSpecAction(
    itemId: number,
    specIds: number[]
): Promise<void> {
    await updateItemBisSpec(itemId, specIds)
}

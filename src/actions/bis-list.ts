"use server"

import { z } from "zod"
import { bisListRepo } from "@/db/repositories/bis-list"
import { authActionClient } from "@/lib/safe-action"
import type { BisList } from "@/shared/models/bis-list.model"

export async function getBisList(): Promise<BisList[]> {
    return await bisListRepo.getAll()
}

export const updateItemBisSpec = authActionClient
    .inputSchema(z.object({ itemId: z.number(), specIds: z.array(z.number()) }))
    .action(async ({ parsedInput }) => {
        await bisListRepo.updateItemBisSpec(parsedInput.itemId, parsedInput.specIds)
    })

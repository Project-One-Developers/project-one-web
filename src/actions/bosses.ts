"use server"

import { bossRepo } from "@/db/repositories/bosses"
import type { Boss, BossWithItems } from "@/shared/types/types"

export async function getBosses(raidId: number): Promise<Boss[]> {
    return await bossRepo.getAll(raidId)
}

export async function getRaidLootTable(raidId: number): Promise<BossWithItems[]> {
    return await bossRepo.getLootTable(raidId)
}

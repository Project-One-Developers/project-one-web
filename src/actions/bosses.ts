'use server'

import { getBosses, getRaidLootTable } from '@/db/repositories/bosses'
import type { Boss, BossWithItems } from '@/shared/types/types'

export async function getBossesAction(raidId: number): Promise<Boss[]> {
    return await getBosses(raidId)
}

export async function getRaidLootTableAction(raidId: number): Promise<BossWithItems[]> {
    return await getRaidLootTable(raidId)
}

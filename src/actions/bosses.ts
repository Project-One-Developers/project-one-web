"use server"

import { bossRepo } from "@/db/repositories/bosses"
import { CURRENT_RAID_IDS } from "@/shared/libs/season-config"
import type { Boss, BossWithItems } from "@/shared/models/boss.models"

export async function getBosses(): Promise<Boss[]> {
    return await bossRepo.getSeasonalRaidBosses(CURRENT_RAID_IDS)
}

export async function getRaidLootTable(): Promise<BossWithItems[]> {
    return await bossRepo.getSeasonalRaidLootTable(CURRENT_RAID_IDS)
}

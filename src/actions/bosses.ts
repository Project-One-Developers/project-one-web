"use server"

import { bossRepo } from "@/db/repositories/bosses"
import { safeAction } from "@/lib/errors/action-wrapper"
import { CURRENT_RAID_IDS } from "@/shared/libs/season-config"
import type { Boss, BossWithItems } from "@/shared/models/boss.models"

export const getBosses = safeAction(async (): Promise<Boss[]> => {
    return bossRepo.getSeasonalRaidBosses(CURRENT_RAID_IDS)
})

export const getRaidLootTable = safeAction(async (): Promise<BossWithItems[]> => {
    return bossRepo.getSeasonalRaidLootTable(CURRENT_RAID_IDS)
})

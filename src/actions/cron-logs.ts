"use server"

import { cronLogRepo } from "@/db/repositories/cron-log.repo"
import { safeAction } from "@/lib/errors/action-wrapper"
import type { CronLog } from "@/shared/models/cron-log.models"

export const getRecentCronLogs = safeAction(
    async (limit?: number): Promise<CronLog[]> => {
        return cronLogRepo.getRecent(limit ?? 3)
    }
)

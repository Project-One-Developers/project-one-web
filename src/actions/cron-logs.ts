"use server"

import { cronLogRepo } from "@/db/repositories/cron-log.repo"
import type { CronLog } from "@/shared/models/cron-log.models"

export async function getRecentCronLogs(limit = 3): Promise<CronLog[]> {
    return cronLogRepo.getRecent(limit)
}

import { desc } from "drizzle-orm"
import "server-only"
import { db } from "@/db"
import { cronLogTable } from "@/db/schema"
import { identity, mapAndParse } from "@/db/utils"
import {
    cronLogSchema,
    type CronLog,
    type NewCronLog,
} from "@/shared/models/cron-log.models"

export const cronLogRepo = {
    add: async (log: NewCronLog): Promise<number> => {
        const result = await db
            .insert(cronLogTable)
            .values({
                jobName: log.jobName,
                status: log.status,
                results: log.results,
                errorMessage: log.errorMessage,
                startedAt: log.startedAt,
                completedAt: log.completedAt,
                durationMs: log.durationMs,
            })
            .returning({ id: cronLogTable.id })
            .then((r) => r.at(0))

        if (!result) {
            throw new Error("Failed to insert cron log")
        }

        return result.id
    },

    getRecent: async (limit = 20): Promise<CronLog[]> => {
        const result = await db
            .select()
            .from(cronLogTable)
            .orderBy(desc(cronLogTable.startedAt))
            .limit(limit)

        return mapAndParse(result, identity, cronLogSchema)
    },
}

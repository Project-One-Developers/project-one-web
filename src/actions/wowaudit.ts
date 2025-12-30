"use server"

import { wowauditRepo } from "@/db/repositories/wowaudit"
import { env } from "@/env"
import { logger } from "@/lib/logger"
import { fetchWowAuditData, parseWowAuditData } from "@/lib/wowaudit/wowaudit-sync"
import {
    formaUnixTimestampToItalianDate,
    getUnixTimestamp,
} from "@/shared/libs/date/date-utils"
import type { CharacterWowAudit } from "@/shared/models/wowaudit.model"

export async function getAllCharacterWowAudit(): Promise<CharacterWowAudit[]> {
    return await wowauditRepo.getAll()
}

export async function getLastWowAuditInfo(
    charName: string,
    charRealm: string
): Promise<CharacterWowAudit | null> {
    return await wowauditRepo.getByChar(charName, charRealm)
}

export async function syncCharacterWowAudit(): Promise<void> {
    logger.info("WowAudit", "Start Sync")

    const json = await fetchWowAuditData(env.WOW_AUDIT_API_KEY)

    if (json !== null) {
        const charsData = await parseWowAuditData(json)
        await wowauditRepo.deleteAll()
        await wowauditRepo.add(charsData)
    }
    logger.info("WowAudit", "End Sync")
}

export async function checkWowAuditUpdates(): Promise<{
    synced: boolean
    message: string
}> {
    logger.info("WowAudit", "checkWowAuditUpdates: checking..")
    const lastSync = await wowauditRepo.getLastTimeSynced()
    const fourHoursUnixTs = 4 * 60 * 60

    if (lastSync === null || getUnixTimestamp() - lastSync > fourHoursUnixTs) {
        logger.info(
            "WowAudit",
            `checkWowAuditUpdates: woaudit older than 4 hours (${
                lastSync !== null ? formaUnixTimestampToItalianDate(lastSync) : "never"
            }) - syncing now`
        )
        await syncCharacterWowAudit()
        return {
            synced: true,
            message: "WowAudit data was older than 4 hours, synced now",
        }
    } else {
        logger.info(
            "WowAudit",
            `checkWowAuditUpdates: woaudit is up to date (${formaUnixTimestampToItalianDate(
                lastSync
            )})`
        )
        return {
            synced: false,
            message: `WowAudit is up to date (${formaUnixTimestampToItalianDate(
                lastSync
            )})`,
        }
    }
}

"use server"

import { settingsRepo } from "@/db/repositories/settings"
import { wowauditRepo } from "@/db/repositories/wowaudit"
import { logger } from "@/lib/logger"
import { fetchWowAuditData, parseWowAuditData } from "@/lib/wowaudit/wowaudit-sync"
import {
    formaUnixTimestampToItalianDate,
    getUnixTimestamp,
} from "@/shared/libs/date/date-utils"
import type { CharacterWowAudit } from "@/shared/types/types"

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
    const key = await settingsRepo.get("WOW_AUDIT_API_KEY")

    if (key === null) {
        throw new Error("WOW_AUDIT_API_KEY not set in database")
    }

    logger.info("WowAudit", "Start Sync")

    const json = await fetchWowAuditData(key)

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

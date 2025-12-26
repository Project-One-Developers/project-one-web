"use server"

import {
    addCharacterWowAudit,
    deleteAllCharacterWowAudit,
    getAllCharacterWowAudit,
    getLastTimeSyncedWowAudit,
    getLastWowAuditInfo,
} from "@/db/repositories/wowaudit"
import { getConfig } from "@/db/repositories/settings"
import { logger } from "@/lib/logger"
import { fetchWowAuditData, parseWowAuditData } from "@/lib/wowaudit/wowaudit-sync"
import {
    formaUnixTimestampToItalianDate,
    getUnixTimestamp,
} from "@/shared/libs/date/date-utils"
import type { CharacterWowAudit } from "@/shared/types/types"

export async function getAllCharacterWowAuditAction(): Promise<CharacterWowAudit[]> {
    return await getAllCharacterWowAudit()
}

export async function getLastWowAuditInfoAction(
    charName: string,
    charRealm: string
): Promise<CharacterWowAudit | null> {
    return await getLastWowAuditInfo(charName, charRealm)
}

export async function syncCharacterWowAuditAction(): Promise<void> {
    const key = await getConfig("WOW_AUDIT_API_KEY")

    if (key === null) {
        throw new Error("WOW_AUDIT_API_KEY not set in database")
    }

    logger.info("WowAudit", "Start Sync")

    const json = await fetchWowAuditData(key)

    if (json !== null) {
        const charsData = await parseWowAuditData(json)
        await deleteAllCharacterWowAudit()
        await addCharacterWowAudit(charsData)
    }
    logger.info("WowAudit", "End Sync")
}

export async function checkWowAuditUpdatesAction(): Promise<{
    synced: boolean
    message: string
}> {
    logger.info("WowAudit", "checkWowAuditUpdates: checking..")
    const lastSync = await getLastTimeSyncedWowAudit()
    const fourHoursUnixTs = 4 * 60 * 60

    if (lastSync === null || getUnixTimestamp() - lastSync > fourHoursUnixTs) {
        logger.info(
            "WowAudit",
            `checkWowAuditUpdates: woaudit older than 4 hours (${
                lastSync !== null ? formaUnixTimestampToItalianDate(lastSync) : "never"
            }) - syncing now`
        )
        await syncCharacterWowAuditAction()
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

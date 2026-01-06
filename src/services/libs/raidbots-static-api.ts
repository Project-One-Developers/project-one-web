/**
 * Raidbots static data API client
 * Fetches encounter-items.json, instances.json, and bonuses.json
 */
import "server-only"
import { env } from "@/env"
import { fetchWithRetry } from "@/lib/fetch-with-retry"
import { logger } from "@/lib/logger"
import { s } from "@/shared/libs/string-utils"
import {
    raidbotsEncounterItemsSchema,
    raidbotsInstancesSchema,
    raidbotsBonusEntrySchema,
    type RaidbotsItem,
    type RaidbotsInstance,
    type RaidbotsBonuses,
} from "./schemas/raidbots-static.schema"

const DEFAULT_RAIDBOTS_BASE_URL = "https://www.raidbots.com/static/data/live"
const RAIDBOTS_BASE_URL = env.OVERRIDE_RAIDBOTS_BASE_URL ?? DEFAULT_RAIDBOTS_BASE_URL

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetchWithRetry(
        url,
        {
            headers: {
                "User-Agent": "ProjectOne-Companion-Web/1.0",
            },
            // Don't cache - always fetch fresh data during sync
            cache: "no-store",
        },
        { maxRetries: 3 }
    )

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSON response validated by caller with Zod
    return response.json() as Promise<T>
}

export const raidbotsStaticApi = {
    /**
     * Fetch encounter items from Raidbots API
     * Contains all item data with sources, specs, stats, etc.
     */
    fetchEncounterItems: async (): Promise<RaidbotsItem[]> => {
        const url = `${RAIDBOTS_BASE_URL}/encounter-items.json`
        logger.info("RaidbotsStaticApi", `Fetching encounter items from ${url}`)

        const data = await fetchJson<unknown>(url)
        const parsed = raidbotsEncounterItemsSchema.safeParse(data)

        if (!parsed.success) {
            logger.error(
                "RaidbotsStaticApi",
                `Failed to parse encounter items: ${s(parsed.error.message)}`
            )
            throw new Error(`Invalid encounter items data: ${parsed.error.message}`)
        }

        logger.info(
            "RaidbotsStaticApi",
            `Fetched ${s(parsed.data.length)} encounter items`
        )
        return parsed.data
    },

    /**
     * Fetch instances from Raidbots API
     * Contains raid/dungeon info with encounters
     */
    fetchInstances: async (): Promise<RaidbotsInstance[]> => {
        const url = `${RAIDBOTS_BASE_URL}/instances.json`
        logger.info("RaidbotsStaticApi", `Fetching instances from ${url}`)

        const data = await fetchJson<unknown>(url)
        const parsed = raidbotsInstancesSchema.safeParse(data)

        if (!parsed.success) {
            logger.error(
                "RaidbotsStaticApi",
                `Failed to parse instances: ${s(parsed.error.message)}`
            )
            throw new Error(`Invalid instances data: ${parsed.error.message}`)
        }

        logger.info("RaidbotsStaticApi", `Fetched ${s(parsed.data.length)} instances`)
        return parsed.data
    },

    /**
     * Fetch bonuses from Raidbots API
     * Contains upgrade tier data (Hero 1/8, Myth 4/8, etc.)
     */
    fetchBonuses: async (): Promise<RaidbotsBonuses> => {
        const url = `${RAIDBOTS_BASE_URL}/bonuses.json`
        logger.info("RaidbotsStaticApi", `Fetching bonuses from ${url}`)

        const data = await fetchJson<unknown>(url)

        // Validate each bonus entry individually, discarding non-compliant entries
        if (typeof data !== "object" || data === null) {
            logger.error(
                "RaidbotsStaticApi",
                `Failed to parse bonuses: expected object, got ${typeof data}`
            )
            throw new Error("Invalid bonuses data: expected object")
        }

        const validBonuses: RaidbotsBonuses = {}
        let discardedCount = 0

        for (const [bonusId, bonusEntry] of Object.entries(data)) {
            const parsed = raidbotsBonusEntrySchema.safeParse(bonusEntry)

            if (parsed.success) {
                validBonuses[bonusId] = parsed.data
            } else {
                discardedCount++
                logger.warn(
                    "RaidbotsStaticApi",
                    `Discarding invalid bonus ${bonusId}: ${s(parsed.error.message)}`
                )
            }
        }

        const validCount = Object.keys(validBonuses).length
        logger.info(
            "RaidbotsStaticApi",
            `Fetched ${s(validCount)} bonus entries${discardedCount > 0 ? ` (${s(discardedCount)} discarded)` : ""}`
        )

        return validBonuses
    },

    /**
     * Fetch all data in parallel
     */
    fetchAll: async (): Promise<{
        encounterItems: RaidbotsItem[]
        instances: RaidbotsInstance[]
        bonuses: RaidbotsBonuses
    }> => {
        logger.info("RaidbotsStaticApi", "Fetching all Raidbots static data in parallel")

        const [encounterItems, instances, bonuses] = await Promise.all([
            raidbotsStaticApi.fetchEncounterItems(),
            raidbotsStaticApi.fetchInstances(),
            raidbotsStaticApi.fetchBonuses(),
        ])

        return { encounterItems, instances, bonuses }
    },
}

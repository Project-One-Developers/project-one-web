/**
 * Bonus processing module
 * Filters and transforms Raidbots bonuses.json data for database storage
 * Ported from Python raid-items script (processing.py filter_bonuses)
 */
import "server-only"
import { logger } from "@/lib/logger"
import { getSeasonByBonusGroup } from "@/shared/libs/items/raid-config"
import { s } from "@/shared/libs/string-utils"
import type { BonusItemTrack } from "@/shared/models/item.models"
import type { WowItemTrackName } from "@/shared/models/wow.models"
import type { RaidbotsBonuses } from "./schemas/raidbots-static.schema"

// Valid track names for filtering
const VALID_TRACK_NAMES = new Set<string>([
    "Explorer",
    "Adventurer",
    "Veteran",
    "Champion",
    "Hero",
    "Myth",
])

// Intermediate type for collecting valid entries before maxItemLevel is known
type PendingTrack = {
    id: number
    level: number
    max: number
    name: WowItemTrackName
    fullName: string
    itemLevel: number
    group: number
    season: number
}

/**
 * Process raw bonuses data into BonusItemTrack records
 *
 * Optimized single-pass approach:
 * 1. Single pass over bonuses: filter valid entries AND calculate group max simultaneously
 * 2. Quick pass over filtered results only: assign maxItemLevel
 */
export function processBonuses(bonuses: RaidbotsBonuses): BonusItemTrack[] {
    logger.info("BonusProcessing", "Processing bonuses data")

    // Single pass: filter valid entries AND calculate group max levels
    const groupMaxLevels = new Map<number, number>()
    const pendingTracks: PendingTrack[] = []
    let skippedNoFullName = 0
    let skippedInvalidName = 0

    for (const [bonusId, entry] of Object.entries(bonuses)) {
        const upgrade = entry.upgrade
        if (!upgrade) {
            continue
        }

        // Track max itemLevel for ALL entries with upgrade (needed for maxItemLevel calculation)
        const currentMax = groupMaxLevels.get(upgrade.group) ?? 0
        if (upgrade.itemLevel > currentMax) {
            groupMaxLevels.set(upgrade.group, upgrade.itemLevel)
        }

        // Skip entries without fullName
        if (!upgrade.fullName) {
            skippedNoFullName++
            continue
        }

        // Skip entries without a valid track name
        if (!upgrade.name || !VALID_TRACK_NAMES.has(upgrade.name)) {
            skippedInvalidName++
            continue
        }

        // We've validated upgrade.name is in VALID_TRACK_NAMES above
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- validated by VALID_TRACK_NAMES.has() check
        const trackName = upgrade.name as WowItemTrackName

        pendingTracks.push({
            id: parseInt(bonusId, 10),
            level: upgrade.level,
            max: upgrade.max,
            name: trackName,
            fullName: upgrade.fullName,
            itemLevel: upgrade.itemLevel,
            group: upgrade.group,
            season: getSeasonByBonusGroup(upgrade.group),
        })
    }

    logger.debug("BonusProcessing", `Found ${s(groupMaxLevels.size)} bonus groups`)

    // Quick pass over filtered results: assign maxItemLevel
    const tracks: BonusItemTrack[] = pendingTracks.map((pending) => ({
        id: pending.id,
        level: pending.level,
        max: pending.max,
        name: pending.name,
        fullName: pending.fullName,
        itemLevel: pending.itemLevel,
        maxItemLevel: groupMaxLevels.get(pending.group) ?? pending.itemLevel,
        season: pending.season,
    }))

    logger.info(
        "BonusProcessing",
        `Processed ${s(tracks.length)} bonus tracks (skipped ${s(skippedNoFullName)} without fullName, ${s(skippedInvalidName)} with invalid name)`
    )

    return tracks
}

/**
 * Filter tracks to only include specific seasons
 */
export function filterTracksBySeason(
    tracks: BonusItemTrack[],
    seasons: number[]
): BonusItemTrack[] {
    const seasonSet = new Set(seasons)
    return tracks.filter((t) => seasonSet.has(t.season) || t.season === -1)
}

/**
 * Group tracks by season for analysis
 */
export function groupTracksBySeason(
    tracks: BonusItemTrack[]
): Map<number, BonusItemTrack[]> {
    const groups = new Map<number, BonusItemTrack[]>()

    for (const track of tracks) {
        const existing = groups.get(track.season) ?? []
        existing.push(track)
        groups.set(track.season, existing)
    }

    return groups
}

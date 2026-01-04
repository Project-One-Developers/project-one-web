/**
 * Server-side bonus tracks service
 * Provides DB-backed access to bonus item tracks for server-side code
 *
 * Features:
 * - Promise-based caching to prevent race conditions
 * - Secondary indexes for O(1) lookups by (itemLevel, name) and (itemLevel, delta)
 * - TTL-based cache expiration (5 minutes)
 */
import "server-only"
import { bonusItemTrackRepo } from "@/db/repositories/bonus-item-tracks"
import { logger } from "@/lib/logger"
import { s } from "@/shared/libs/string-utils"
import type { BonusItemTrack } from "@/shared/models/item.models"
import type { WowItemTrackName } from "@/shared/models/wow.models"

// ============================================================================
// Cache structure with indexed lookups
// ============================================================================

type BonusTrackCache = {
    /** Primary index: bonusId -> track */
    byId: Map<number, BonusItemTrack>
    /** Secondary index: "itemLevel:name" -> { key, track } */
    byIlvlName: Map<string, { key: string; track: BonusItemTrack }>
    /** Secondary index: "itemLevel:delta" -> { key, track } */
    byIlvlDelta: Map<string, { key: string; track: BonusItemTrack }>
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Promise-based cache to prevent race conditions
let cachePromise: Promise<BonusTrackCache> | null = null
let cacheLoadedAt: number | null = null

/**
 * Build cache indexes from raw tracks
 */
function buildCacheIndexes(tracks: BonusItemTrack[]): BonusTrackCache {
    const byId = new Map<number, BonusItemTrack>()
    const byIlvlName = new Map<string, { key: string; track: BonusItemTrack }>()
    const byIlvlDelta = new Map<string, { key: string; track: BonusItemTrack }>()

    for (const track of tracks) {
        const key = String(track.id)

        // Primary index
        byId.set(track.id, track)

        // Secondary index: itemLevel + name
        const ilvlNameKey = `${String(track.itemLevel)}:${track.name}`
        byIlvlName.set(ilvlNameKey, { key, track })

        // Secondary index: itemLevel + delta (max - level)
        const delta = track.max - track.level
        const ilvlDeltaKey = `${String(track.itemLevel)}:${String(delta)}`
        byIlvlDelta.set(ilvlDeltaKey, { key, track })
    }

    return { byId, byIlvlName, byIlvlDelta }
}

/**
 * Load bonus tracks from database and build indexes
 */
async function loadBonusTracksFromDb(): Promise<BonusTrackCache> {
    logger.debug("BonusTracks", "Loading bonus tracks from database...")
    const tracks = await bonusItemTrackRepo.getAll()
    const cache = buildCacheIndexes(tracks)
    logger.info("BonusTracks", `Loaded ${s(cache.byId.size)} bonus tracks with indexes`)
    return cache
}

/**
 * Check if cache is expired
 */
function isCacheExpired(): boolean {
    if (!cacheLoadedAt) {
        return true
    }
    return Date.now() - cacheLoadedAt >= CACHE_TTL_MS
}

/**
 * Get bonus tracks cache (loading from DB if needed)
 * Uses Promise-based caching to prevent race conditions on concurrent requests
 */
async function getBonusTracksCache(): Promise<BonusTrackCache> {
    // If cache is valid, return the existing promise
    if (cachePromise && !isCacheExpired()) {
        return cachePromise
    }

    // Start loading and cache the promise itself (not just the result)
    // This prevents multiple concurrent requests from triggering multiple DB loads
    cacheLoadedAt = Date.now()
    cachePromise = loadBonusTracksFromDb()

    return cachePromise
}

/**
 * Invalidate the cache (call after sync)
 */
export function invalidateBonusTracksCache(): void {
    cachePromise = null
    cacheLoadedAt = null
    logger.debug("BonusTracks", "Cache invalidated")
}

// ============================================================================
// Server-side query functions (DB-backed with O(1) indexed lookups)
// ============================================================================

/**
 * Get bonus track by ID (O(1) lookup)
 */
export async function getBonusTrack(bonusId: number): Promise<BonusItemTrack | null> {
    const cache = await getBonusTracksCache()
    return cache.byId.get(bonusId) ?? null
}

/**
 * Query bonus track by item level and track name (O(1) indexed lookup)
 */
export async function queryBonusTrackByItemLevelAndName(
    itemLevel: number,
    name: string
): Promise<{ key: string; track: BonusItemTrack } | null> {
    const cache = await getBonusTracksCache()
    const lookupKey = `${String(itemLevel)}:${name}`
    return cache.byIlvlName.get(lookupKey) ?? null
}

/**
 * Query bonus track by item level and upgrade delta (O(1) indexed lookup)
 */
export async function queryBonusTrackByItemLevelAndDelta(
    itemLevel: number,
    delta: number
): Promise<{ key: string; track: BonusItemTrack } | null> {
    const cache = await getBonusTracksCache()
    const lookupKey = `${String(itemLevel)}:${String(delta)}`
    return cache.byIlvlDelta.get(lookupKey) ?? null
}

/**
 * Parse item track from bonus IDs (DB-backed version)
 * Checks each bonus ID against the cache until a match is found
 */
export async function parseItemTrackFromDb(
    bonusIds: number[]
): Promise<BonusItemTrack | null> {
    const cache = await getBonusTracksCache()

    for (const bonusId of bonusIds) {
        const track = cache.byId.get(bonusId)
        if (track) {
            return track
        }
    }

    return null
}

/**
 * Get all bonus tracks as a record (for compatibility with existing code)
 */
export async function getAllBonusTracksAsRecord(): Promise<
    Record<string, BonusItemTrack>
> {
    const cache = await getBonusTracksCache()
    const record: Record<string, BonusItemTrack> = {}

    for (const [bonusId, track] of cache.byId.entries()) {
        record[String(bonusId)] = track
    }

    return record
}

/**
 * Get bonus tracks by season
 */
export async function getBonusTracksBySeason(season: number): Promise<BonusItemTrack[]> {
    const cache = await getBonusTracksCache()
    return Array.from(cache.byId.values()).filter((t) => t.season === season)
}

// ============================================================================
// Utility types re-exported
// ============================================================================

export type { BonusItemTrack }
export type { WowItemTrackName }

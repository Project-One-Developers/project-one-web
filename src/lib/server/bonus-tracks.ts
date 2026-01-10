/**
 * Server-side bonus tracks cache invalidation
 * Used to clear the cache after syncing new bonus tracks
 */
import "server-only"
import { logger } from "@/lib/logger"

/**
 * Invalidate the cache (call after sync)
 * Currently a no-op as direct cache loading was removed
 */
export function invalidateBonusTracksCache(): void {
    logger.debug("BonusTracks", "Cache invalidated")
}

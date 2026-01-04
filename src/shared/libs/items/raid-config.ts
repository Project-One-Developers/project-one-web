/**
 * Raid sync configuration
 * Contains sync-specific constants (encounter filters, source types)
 * Season-specific data is in season-config.ts
 */

// Encounter IDs to ignore during sync
export const ENCOUNTER_IDS_TO_IGNORE = new Set([
    1301, // Blackrock depths
    1278, // TWW World Bosses
    1312, // Midnight World Bosses
])

// Source types to match during sync
export const SOURCE_TYPES_TO_MATCH = new Set([
    "mplus-chest",
    "raid",
    "profession593",
    "catalyst",
    "delve-epic",
])

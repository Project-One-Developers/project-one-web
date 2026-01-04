/**
 * Raid and season configuration ported from Python raid-items script (config.py)
 * Used for determining item levels and season assignment
 */

// Season mapping configuration
export type SeasonConfig = {
    raidIds: Set<number>
    mplusIds: Set<number>
    catalystIds: Set<number>
    bonusGroupIds: Set<number>
}

export const SEASON_MAPPING: Record<number, SeasonConfig> = {
    1: {
        raidIds: new Set([1273]), // Nerubar
        mplusIds: new Set([1023, 71, 1182, 1184, 1269, 1270, 1271, 1274]),
        catalystIds: new Set([-70]),
        bonusGroupIds: new Set(), // Season 1 bonus groups
    },
    2: {
        raidIds: new Set([1296]), // Undermine
        mplusIds: new Set([1268, 1267, 1187, 1178, 1298, 1012, 1272, 1210]),
        catalystIds: new Set([-71]),
        bonusGroupIds: new Set(), // Season 2 bonus groups
    },
    3: {
        raidIds: new Set([1302]), // Manaforge Omega
        mplusIds: new Set([1271, 1303, 1185, 1298, 1267, 1194, 1270]),
        catalystIds: new Set([-82]),
        bonusGroupIds: new Set([513, 514, 515, 516, 517, 518]),
    },
    // Midnight expansion (future)
    16: {
        raidIds: new Set([1307, 1308, 1314]),
        mplusIds: new Set([2825, 2811, 2874, 2813, 2915, 2859, 2923, 2805]),
        catalystIds: new Set(),
        bonusGroupIds: new Set([607, 608, 609, 610, 611, 612]),
    },
}

// Raid item level configuration
// Arrays directly map boss order (0-indexed) to item level for each difficulty
export type RaidIlvlConfig = {
    champion: number[] // Normal difficulty
    hero: number[] // Heroic difficulty
    mythic: number[] // Mythic difficulty
    boeIlvl: {
        champion: number
        hero: number
        mythic: number
    }
}

export const RAID_ILVL_CONFIG: Record<number, RaidIlvlConfig> = {
    // TWW Season 1 - Nerubar (8 bosses)
    1273: {
        champion: [597, 597, 600, 600, 603, 603, 606, 606],
        hero: [610, 610, 613, 613, 616, 616, 619, 619],
        mythic: [623, 623, 626, 626, 629, 629, 632, 632],
        boeIlvl: { champion: 606, hero: 619, mythic: 632 },
    },
    // TWW Season 2 - Undermine (8 bosses)
    1296: {
        champion: [636, 639, 639, 642, 642, 642, 645, 645],
        hero: [649, 652, 652, 655, 655, 655, 658, 658],
        mythic: [662, 665, 665, 668, 668, 668, 672, 672],
        boeIlvl: { champion: 642, hero: 655, mythic: 668 },
    },
    // TWW Season 3 - Manaforge Omega (8 bosses)
    1302: {
        champion: [681, 681, 681, 681, 681, 681, 681, 681],
        hero: [694, 694, 694, 694, 694, 694, 694, 694],
        mythic: [710, 710, 710, 714, 714, 714, 717, 717],
        boeIlvl: { champion: 681, hero: 694, mythic: 714 },
    },
    // Midnight - The Voidspire (6 bosses)
    1307: {
        champion: [246, 250, 250, 253, 253, 256],
        hero: [259, 263, 263, 266, 266, 269],
        mythic: [272, 276, 276, 279, 279, 282],
        boeIlvl: { champion: 253, hero: 266, mythic: 279 },
    },
    // Midnight - March on Quel'Danas (2 bosses)
    1308: {
        champion: [253, 256],
        hero: [266, 269],
        mythic: [279, 282],
        boeIlvl: { champion: 253, hero: 266, mythic: 279 },
    },
    // Midnight - The Dreamrift (1 boss)
    1314: {
        champion: [253],
        hero: [266],
        mythic: [279],
        boeIlvl: { champion: 253, hero: 266, mythic: 279 },
    },
}

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

/**
 * Get season number for a given bonus group ID
 */
export function getSeasonByBonusGroup(groupId: number): number {
    for (const [season, mapping] of Object.entries(SEASON_MAPPING)) {
        if (mapping.bonusGroupIds.has(groupId)) {
            return parseInt(season)
        }
    }
    return -1 // Unknown season
}

/**
 * Get raid IDs for a given catalyst ID
 * Searches through SEASON_MAPPING in descending order (highest season first)
 */
export function getRaidIdsByCatalystId(catalystId: number): number[] {
    const seasons = Object.keys(SEASON_MAPPING)
        .map(Number)
        .sort((a, b) => b - a)

    for (const season of seasons) {
        const mapping = SEASON_MAPPING[season]
        if (mapping?.catalystIds.has(catalystId)) {
            return [...mapping.raidIds]
        }
    }
    return []
}

/**
 * Determine item level based on raid config and boss order
 */
export function getItemLevelsForBoss(
    raidId: number,
    bossOrder: number, // 1-indexed
    isVeryRare: boolean,
    isBoeOrCatalyst: boolean
): { normal: number; heroic: number; mythic: number } | null {
    const config = RAID_ILVL_CONFIG[raidId]
    if (!config) {
        return null
    }

    // Convert to 0-indexed
    const bossIndex = bossOrder - 1

    // Very rare items always get max item level
    if (isVeryRare) {
        const lastChampion = config.champion[config.champion.length - 1]
        const lastHero = config.hero[config.hero.length - 1]
        const lastMythic = config.mythic[config.mythic.length - 1]
        if (
            lastChampion === undefined ||
            lastHero === undefined ||
            lastMythic === undefined
        ) {
            return null
        }
        return {
            normal: lastChampion,
            heroic: lastHero,
            mythic: lastMythic,
        }
    }

    // BOE and catalyst items use configured BOE item levels
    if (isBoeOrCatalyst || bossIndex === 98 || bossIndex < 0) {
        return {
            normal: config.boeIlvl.champion,
            heroic: config.boeIlvl.hero,
            mythic: config.boeIlvl.mythic,
        }
    }

    // Check if boss index is valid
    if (bossIndex >= config.champion.length) {
        return {
            normal: config.boeIlvl.champion,
            heroic: config.boeIlvl.hero,
            mythic: config.boeIlvl.mythic,
        }
    }

    const normal = config.champion[bossIndex]
    const heroic = config.hero[bossIndex]
    const mythic = config.mythic[bossIndex]
    if (normal === undefined || heroic === undefined || mythic === undefined) {
        return null
    }

    return { normal, heroic, mythic }
}

/**
 * Determine season for an item based on its source
 */
export function determineItemSeason(
    sourceId: number,
    bossId: number,
    defaultSeason: number
): number {
    for (const [season, mapping] of Object.entries(SEASON_MAPPING)) {
        const seasonNum = parseInt(season)
        if (
            mapping.raidIds.has(sourceId) ||
            mapping.catalystIds.has(sourceId) ||
            (sourceId === -1 && mapping.mplusIds.has(bossId))
        ) {
            return seasonNum
        }
    }
    return defaultSeason
}

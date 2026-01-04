/**
 * Consolidated season configuration
 * Single source of truth for all season-specific data
 */

// Season numbers as a const array for type derivation
export const SEASON_NUMBERS = [1, 2, 3, 16] as const
export type Season = (typeof SEASON_NUMBERS)[number] // 1 | 2 | 3 | 16

// Raid item level configuration per difficulty
export type RaidIlvlConfig = {
    champion: number[] // Normal difficulty - array maps boss order (0-indexed) to ilvl
    hero: number[] // Heroic difficulty
    mythic: number[] // Mythic difficulty
    boeIlvl: {
        champion: number
        hero: number
        mythic: number
    }
}

// Season configuration type
export type SeasonConfig = {
    // Instance IDs
    raidIds: number[]
    mplusIds: number[]
    catalystSourceId: number // e.g. -70, -71, -82

    // Currency/Item IDs
    catalystChargeId: number // Currency for catalyst charges
    mountId: number | null // Raid mount (null if none)

    // Bonus configuration
    bonusGroupIds: number[]

    // Raid item level config
    raidIlvl: Record<number, RaidIlvlConfig>
}

/**
 * All season configurations
 * To add a new season: add entry here AND to SEASON_NUMBERS array
 */
export const SEASONS: Record<Season, SeasonConfig> = {
    // TWW Season 1 - Nerubar Palace
    1: {
        raidIds: [1273],
        mplusIds: [1023, 71, 1182, 1184, 1269, 1270, 1271, 1274],
        catalystSourceId: -70,
        catalystChargeId: 3116, // https://www.wowhead.com/currency=3116/essence-of-kajamite
        mountId: null,
        bonusGroupIds: [],
        raidIlvl: {
            1273: {
                champion: [597, 597, 600, 600, 603, 603, 606, 606],
                hero: [610, 610, 613, 613, 616, 616, 619, 619],
                mythic: [623, 623, 626, 626, 629, 629, 632, 632],
                boeIlvl: { champion: 606, hero: 619, mythic: 632 },
            },
        },
    },

    // TWW Season 2 - Liberation of Undermine
    2: {
        raidIds: [1296],
        mplusIds: [1268, 1267, 1187, 1178, 1298, 1012, 1272, 1210],
        catalystSourceId: -71,
        catalystChargeId: 2813, // https://www.wowhead.com/currency=2813/harmonized-silk
        mountId: null,
        bonusGroupIds: [],
        raidIlvl: {
            1296: {
                champion: [636, 639, 639, 642, 642, 642, 645, 645],
                hero: [649, 652, 652, 655, 655, 655, 658, 658],
                mythic: [662, 665, 665, 668, 668, 668, 672, 672],
                boeIlvl: { champion: 642, hero: 655, mythic: 668 },
            },
        },
    },

    // TWW Season 3 - Manaforge Omega
    3: {
        raidIds: [1302],
        mplusIds: [1271, 1303, 1185, 1298, 1267, 1194, 1270],
        catalystSourceId: -82,
        catalystChargeId: 3269, // https://www.wowhead.com/currency=3269/ethereal-voidsplinter
        mountId: 2569, // Unbound Star-Eater https://warcraftmounts.com/mounts/unboundstareater.php
        bonusGroupIds: [513, 514, 515, 516, 517, 518],
        raidIlvl: {
            1302: {
                champion: [681, 681, 681, 681, 681, 681, 681, 681],
                hero: [694, 694, 694, 694, 694, 694, 694, 694],
                mythic: [710, 710, 710, 714, 714, 714, 717, 717],
                boeIlvl: { champion: 681, hero: 694, mythic: 714 },
            },
        },
    },

    // Midnight expansion (future)
    16: {
        raidIds: [1307, 1308, 1314],
        mplusIds: [2825, 2811, 2874, 2813, 2915, 2859, 2923, 2805],
        catalystSourceId: 0, // TBD
        catalystChargeId: 0, // TBD
        mountId: null,
        bonusGroupIds: [607, 608, 609, 610, 611, 612],
        raidIlvl: {
            // The Voidspire (6 bosses)
            1307: {
                champion: [246, 250, 250, 253, 253, 256],
                hero: [259, 263, 263, 266, 266, 269],
                mythic: [272, 276, 276, 279, 279, 282],
                boeIlvl: { champion: 253, hero: 266, mythic: 279 },
            },
            // March on Quel'Danas (2 bosses)
            1308: {
                champion: [253, 256],
                hero: [266, 269],
                mythic: [279, 282],
                boeIlvl: { champion: 253, hero: 266, mythic: 279 },
            },
            // The Dreamrift (1 boss)
            1314: {
                champion: [253],
                hero: [266],
                mythic: [279],
                boeIlvl: { champion: 253, hero: 266, mythic: 279 },
            },
        },
    },
}

// ============== Current Season (single place to update) ==============

export const CURRENT_SEASON: Season = 3

// ============== Derived Values (type-safe, no runtime checks needed) ==============

export const currentSeason = SEASONS[CURRENT_SEASON] // Guaranteed by Season type
// TODO: this will need fixes for handling multiple raids
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Config guarantees at least one raid ID
export const CURRENT_RAID_ID = currentSeason.raidIds[0]!
export const CURRENT_CATALYST_CHARGE_ID = currentSeason.catalystChargeId
export const CURRENT_MOUNT_ID = currentSeason.mountId

// ============== Helper Functions ==============

/**
 * Get season number for a given bonus group ID
 */
export function getSeasonByBonusGroup(groupId: number): number {
    for (const [season, config] of Object.entries(SEASONS)) {
        if (config.bonusGroupIds.includes(groupId)) {
            return parseInt(season)
        }
    }
    return -1 // Unknown season
}

/**
 * Get raid IDs for a given catalyst source ID
 * Searches through SEASONS in descending order (highest season first)
 */
export function getRaidIdsByCatalystId(catalystId: number): number[] {
    const seasons = [...SEASON_NUMBERS].sort((a, b) => b - a)

    for (const season of seasons) {
        const config = SEASONS[season]
        if (config.catalystSourceId === catalystId) {
            return [...config.raidIds]
        }
    }
    return []
}

/**
 * Get season number for a given raid ID
 */
export function getSeasonByRaidId(raidId: number): number | null {
    for (const [season, config] of Object.entries(SEASONS)) {
        if (config.raidIds.includes(raidId)) {
            return parseInt(season)
        }
    }
    return null
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
    // Find the raid config across all seasons
    let config: RaidIlvlConfig | undefined
    for (const seasonConfig of Object.values(SEASONS)) {
        if (seasonConfig.raidIlvl[raidId]) {
            config = seasonConfig.raidIlvl[raidId]
            break
        }
    }

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
    for (const [season, config] of Object.entries(SEASONS)) {
        const seasonNum = parseInt(season)
        if (
            config.raidIds.includes(sourceId) ||
            config.catalystSourceId === sourceId ||
            (sourceId === -1 && config.mplusIds.includes(bossId))
        ) {
            return seasonNum
        }
    }
    return defaultSeason
}

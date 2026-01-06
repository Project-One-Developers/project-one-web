import { match } from "ts-pattern"
import {
    getCraftedItemLevel,
    getSeasonByCraftedIlvl,
    getSpecialItemLevel,
} from "@/shared/libs/season-config"
import type { GearItem, Item, ItemTrack } from "@/shared/models/item.models"
import type { WowItemTrackName, WowRaidDifficulty } from "@/shared/models/wow.models"
import { DIFF_BONUS_ID_TO_TRACK, RAID_DIFF_BONUS_IDS } from "@/shared/wow.consts"
import {
    bonusItemTracks,
    queryByItemLevelAndName,
    trackNameToNumber,
    wowRaidDiffToTrackName,
} from "./item-tracks"

/**
 * Return item track name.
 * In case of token or tierset the track name is not well defined, we deduce it from Diff bonusId
 */
export function parseItemTrackName(
    bonusIds: number[],
    isToken: boolean,
    isTierset: boolean
): WowItemTrackName | null {
    if (bonusIds.length === 0) {
        return null
    }

    const itemTrack = parseItemTrack(bonusIds)
    if (itemTrack) {
        return itemTrack.name
    }

    // Check for difficulty bonus ID
    const diffBonusId = bonusIds.find(
        (id): id is keyof typeof DIFF_BONUS_ID_TO_TRACK => id in DIFF_BONUS_ID_TO_TRACK
    )
    if (diffBonusId !== undefined) {
        return DIFF_BONUS_ID_TO_TRACK[diffBonusId]
    }

    // Token/tierset without diff bonus → Champion
    if (isToken || isTierset) {
        return "Champion"
    }

    return null
}

/**
 * Compare two gear item to find if its the same item id and diff tracks (es: Spymaster 632M and 639M are the same item)
 */
export function gearAreTheSame(a: GearItem, b: GearItem): boolean {
    const aItemId = a.item.id
    const bItemId = b.item.id

    if (aItemId !== bItemId || a.item.season !== b.item.season) {
        return false // Different item ID or season
    }

    if (a.itemTrack && b.itemTrack) {
        return a.itemTrack.maxItemLevel === b.itemTrack.maxItemLevel
    }

    if (a.item.token && b.item.token) {
        // Ensure correct bonusIds are used for each comparison
        const aTrackName = parseItemTrackName(
            a.bonusIds ?? [],
            a.item.token,
            a.item.tierset
        )
        const bTrackName = parseItemTrackName(
            b.bonusIds ?? [],
            b.item.token,
            b.item.tierset
        )
        return aTrackName === bTrackName
    }

    return false // Not comparable -> not the same item
}

/**
 * Compare gear item a and b
 * Compare over season, item track, item level (it detects overlaps like 626HC vs 626M)
 * @param a First Gear to compare
 * @param b Second Gear to compare
 * @returns 1 if a is an upgrade over b, -1 b otherwise, 0 if are the same
 */
export function compareGearItem(a: GearItem, b: GearItem): number {
    const delta = a.itemLevel - b.itemLevel

    if (a.item.season !== b.item.season) {
        // a is item from new season
        return a.item.season > b.item.season ? 1 : -1
    }

    if (a.itemTrack && b.itemTrack) {
        // Compare max theoretical item level
        return Math.sign(a.itemTrack.maxItemLevel - b.itemTrack.maxItemLevel)
    }

    if ((a.item.token || b.item.token) && Math.abs(delta) <= 9) {
        // Token doesn't have item track
        const aDiff = trackNameToNumber(
            parseItemTrackName(a.bonusIds ?? [], a.item.token, a.item.tierset)
        )
        const bDiff = trackNameToNumber(
            parseItemTrackName(b.bonusIds ?? [], b.item.token, b.item.tierset)
        )

        // The item with a track wins over one without a track
        if (aDiff !== null && bDiff === null) {
            return 1
        }
        if (aDiff === null && bDiff !== null) {
            return -1
        }
        if (aDiff === null || bDiff === null) {
            // Both null - treat as equal
            return 0
        }

        return Math.sign(aDiff - bDiff)
    }

    // If difference is above 9, we use item level difference directly
    return Math.sign(delta)
}

function getItemLevelFromTrack(item: Item, bonusIds: number[]): number | null {
    const track = parseItemTrackName(bonusIds, item.token, item.tierset)
    if (!track) {
        return null
    }

    return match(track)
        .with("Veteran", () => item.ilvlBase + 22)
        .with("Champion", () => item.ilvlNormal)
        .with("Hero", () => item.ilvlHeroic)
        .with("Myth", () => item.ilvlMythic)
        .with("Explorer", "Adventurer", () => {
            throw Error(`getItemLevelFromTrack: ${track} not mapped`)
        })
        .exhaustive()
}

export const parseItemLevelFromBonusIds = (
    item: Item,
    bonusIds: number[]
): number | null =>
    getItemLevelFromTrack(item, bonusIds) ??
    getCraftedItemLevel(bonusIds) ??
    getSpecialItemLevel(item.id, item.sourceType)

export function evalRealSeason(item: Item, ilvl: number): number {
    // Epic crafted item
    if (item.sourceType === "profession593") {
        return getSeasonByCraftedIlvl(ilvl)
    }
    return item.season
}

export const parseItemLevelFromRaidDiff = (
    item: Item,
    raidDiff: WowRaidDifficulty
): number =>
    match(raidDiff)
        .with("LFR", () => item.ilvlBase + 22)
        .with("Normal", () => item.ilvlNormal)
        .with("Heroic", () => item.ilvlHeroic)
        .with("Mythic", () => item.ilvlMythic)
        .exhaustive()

export function parseItemTrack(input: number[]): ItemTrack | null {
    const matchingBonus = input.find((bonus) => bonus in bonusItemTracks)

    if (matchingBonus === undefined) {
        return null
    }

    // Return the matching track or null if none found
    return bonusItemTracks[matchingBonus] ?? null
}

const gearHasAvoidance = (input: number[] | null): boolean =>
    input ? input.includes(40) : false

const gearHasLeech = (input: number[] | null): boolean =>
    input ? input.includes(41) : false

const gearHasSpeed = (input: number[] | null): boolean =>
    input ? input.includes(42) : false

// 10397,12055 Primastic Socket
// 11307 Socket on Crafted Gear
export const gearhasSocket = (input: number[] | null): boolean =>
    input ? [10397, 11307, 12055].some((value) => input.includes(value)) : false

export const gearTertiary = (input: number[] | null): boolean =>
    gearHasAvoidance(input) || gearHasLeech(input) || gearHasSpeed(input)

export function getItemTrack(ilvl: number, diff: WowRaidDifficulty): ItemTrack | null {
    const diffName: WowItemTrackName = wowRaidDiffToTrackName(diff)
    const res = queryByItemLevelAndName(ilvl, diffName)
    if (res !== null) {
        return res.track
    }
    return null
}

// gear manipolation

export function applyDiffBonusId(input: number[], diff: WowRaidDifficulty): void {
    const bonusId = RAID_DIFF_BONUS_IDS[diff]
    if (bonusId !== null) {
        input.push(bonusId)
    }
}

/**
 * Apply track bonus ids and return
 * @param input Bonus id array to fill
 * @param ilvl Gear ilvl
 * @param diff Gear raid difficulty (eg: Heroic item)
 */
export function applyItemTrackByIlvlAndDiff(
    input: number[],
    ilvl: number,
    diff: WowRaidDifficulty
): ItemTrack | null {
    applyDiffBonusId(input, diff)
    const diffName: WowItemTrackName = wowRaidDiffToTrackName(diff)
    const res = queryByItemLevelAndName(ilvl, diffName)
    if (res !== null) {
        input.push(Number(res.key))
        return res.track
    }
    return null
}

export function applySocket(input: number[]): void {
    input.push(12055)
}
export function applyAvoidance(input: number[]): void {
    input.push(40)
}
export function applyLeech(input: number[]): void {
    input.push(41)
}
export function applySpeed(input: number[]): void {
    input.push(42)
}

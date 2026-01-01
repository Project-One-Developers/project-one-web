"use server"

import { groupBy, keyBy } from "es-toolkit"
import { Duration } from "luxon"
import { bisListRepo } from "@/db/repositories/bis-list"
import { blizzardRepo } from "@/db/repositories/blizzard"
import { characterRepo } from "@/db/repositories/characters"
import { droptimizerRepo } from "@/db/repositories/droptimizer"
import { itemRepo } from "@/db/repositories/items"
import { lootRepo } from "@/db/repositories/loots"
import { raidSessionRepo } from "@/db/repositories/raid-sessions"
import { simcRepo } from "@/db/repositories/simc"
import {
    evalHighlightsAndScore,
    getLatestSyncDate,
    parseBestItemInSlot,
    parseBlizzardWarn,
    parseCatalystCharge,
    parseDroptimizerWarn,
    parseDroptimizersInfo,
    parseGreatVault,
    parseLootAlreadyGotIt,
    parseLootBisSpecForChar,
    parseTiersetInfo,
} from "@/lib/loot/loot-utils"
import {
    parseManualLoots,
    parseMrtLoots,
    parseRcLoots,
} from "@/services/loot/loot-parsers"
import { isInCurrentWowWeek } from "@/shared/libs/date/date-utils"
import { compareGearItem, gearAreTheSame } from "@/shared/libs/items/item-bonus-utils"
import { s } from "@/shared/libs/safe-stringify"
import { getWowClassFromIdOrName } from "@/shared/libs/spec-parser/spec-utils"
import type { CharacterBlizzard } from "@/shared/models/blizzard.model"
import type { CharacterWithGears } from "@/shared/models/character.model"
import type {
    CharAssignmentHighlights,
    Loot,
    LootWithAssigned,
    LootWithItem,
    NewLoot,
    NewLootManual,
} from "@/shared/models/loot.model"
import type { SimC } from "@/shared/models/simulation.model"
import type { CharAssignmentInfo, LootAssignmentInfo } from "@/shared/types/types"

const RAID_SESSION_TIME_WINDOW = Duration.fromObject({ hours: 5 }).as("seconds")

export async function getLootsBySessionId(raidSessionId: string): Promise<Loot[]> {
    return await lootRepo.getByRaidSessionId(raidSessionId)
}

export async function getLootsBySessionIdWithItem(
    raidSessionId: string
): Promise<LootWithItem[]> {
    return await lootRepo.getByRaidSessionIdWithItem(raidSessionId)
}

export async function getLootsBySessionIdWithAssigned(
    raidSessionId: string
): Promise<LootWithAssigned[]> {
    return await lootRepo.getByRaidSessionIdWithAssigned(raidSessionId)
}

export async function getLootsBySessionIdsWithAssigned(
    raidSessionIds: string[]
): Promise<LootWithAssigned[]> {
    return await lootRepo.getByRaidSessionIdsWithAssigned(raidSessionIds)
}

export async function getLootWithItemById(lootId: string): Promise<LootWithItem> {
    return await lootRepo.getWithItemById(lootId)
}

export async function assignLoot(
    charId: string,
    lootId: string,
    highlights: CharAssignmentHighlights | null
): Promise<void> {
    await lootRepo.assign(charId, lootId, highlights)
}

export async function unassignLoot(lootId: string): Promise<void> {
    await lootRepo.unassign(lootId)
}

export async function tradeLoot(lootId: string): Promise<void> {
    await lootRepo.trade(lootId)
}

export async function untradeLoot(lootId: string): Promise<void> {
    await lootRepo.untrade(lootId)
}

export async function deleteLoot(lootId: string): Promise<void> {
    await lootRepo.delete(lootId)
}

export async function addLoots(raidSessionId: string, loots: NewLoot[]): Promise<void> {
    const eligibleCharacters = await raidSessionRepo.getRoster(raidSessionId)
    await lootRepo.addMany(raidSessionId, loots, eligibleCharacters)
}

// ============== LOOT IMPORT ACTIONS ==============

/**
 * Import loot from RC Loot Council CSV export
 */
export async function importRcLootCsv(
    raidSessionId: string,
    csv: string,
    importAssignedCharacter: boolean
): Promise<{ imported: number; errors: string[] }> {
    const session = await raidSessionRepo.getById(raidSessionId)

    // Date bounds: session date +5 hours
    const dateLowerBound = session.raidDate
    const dateUpperBound = session.raidDate + RAID_SESSION_TIME_WINDOW

    const allItems = await itemRepo.getAll()
    const allCharacters = importAssignedCharacter ? await characterRepo.getList() : []

    const loots = parseRcLoots(
        csv,
        dateLowerBound,
        dateUpperBound,
        importAssignedCharacter,
        allItems,
        allCharacters
    )

    if (loots.length > 0) {
        const eligibleCharacters = await raidSessionRepo.getRoster(raidSessionId)
        await lootRepo.addMany(raidSessionId, loots, eligibleCharacters)
    }

    return { imported: loots.length, errors: [] }
}

// Helper function to compare bonus ID arrays
const bonusIdsMatch = (
    lootBonusIds: number[] | null,
    targetBonusIds: number[]
): boolean => {
    if (!lootBonusIds && targetBonusIds.length === 0) {
        return true
    }
    if (lootBonusIds?.length !== targetBonusIds.length) {
        return false
    }

    // Sort both arrays and compare element by element
    const sortedLootBonusIds = [...lootBonusIds].sort((a, b) => a - b)
    const sortedTargetBonusIds = [...targetBonusIds].sort((a, b) => a - b)

    return sortedLootBonusIds.every((id, index) => id === sortedTargetBonusIds[index])
}

/**
 * Import loot assignments from RC Loot Council CSV export
 * This assigns existing session loots based on RC Loot Council data
 */
export async function importRcLootAssignments(
    raidSessionId: string,
    csv: string
): Promise<{ assigned: number; warnings: string[] }> {
    const session = await raidSessionRepo.getById(raidSessionId)

    const allItems = await itemRepo.getAll()
    const allCharacters = await characterRepo.getList()

    const [rcLootData, sessionLoots] = await Promise.all([
        Promise.resolve(
            parseRcLoots(
                csv,
                session.raidDate,
                session.raidDate + RAID_SESSION_TIME_WINDOW,
                true,
                allItems,
                allCharacters
            )
        ),
        lootRepo.getByRaidSessionId(raidSessionId),
    ])

    const warnings: string[] = []
    let assignedCount = 0

    // Build assignment map: charId:itemString -> count
    const assignmentMap = new Map<string, number>()
    for (const rcLoot of rcLootData) {
        if (rcLoot.assignedTo) {
            const assignmentKey = `${rcLoot.assignedTo}#${s(rcLoot.gearItem.item.id)}#${rcLoot.gearItem.bonusIds?.join(",") ?? ""}`
            assignmentMap.set(assignmentKey, (assignmentMap.get(assignmentKey) || 0) + 1)
        }
    }

    // Process each assignment
    for (const [assignmentKey, requiredAmount] of assignmentMap.entries()) {
        const parts = assignmentKey.split("#")
        const charId = parts[0]
        const itemIdString = parts[1]
        const bonusIdsString = parts[2]

        if (!charId || !itemIdString) {
            continue
        }

        // Parse itemId as number and bonusIds as array
        const itemId = parseInt(itemIdString, 10)
        const bonusIds = bonusIdsString
            ? bonusIdsString.split(",").map((id) => parseInt(id, 10))
            : []

        // Find eligible loots for this character and item with matching bonus IDs
        const eligibleLoots = sessionLoots.filter(
            (loot) =>
                loot.itemId === itemId &&
                bonusIdsMatch(loot.gearItem.bonusIds, bonusIds) &&
                loot.charsEligibility.includes(charId)
        )

        const alreadyAssignedCount = eligibleLoots.filter(
            (loot) => loot.assignedCharacterId === charId
        ).length

        const unassignedLoots = eligibleLoots.filter((loot) => !loot.assignedCharacterId)
        const availableCount = unassignedLoots.length
        const remainingNeeded = Math.max(0, requiredAmount - alreadyAssignedCount)
        const actualAssignCount = Math.min(remainingNeeded, availableCount)

        // Warn if we can't fulfill the full request
        if (remainingNeeded > availableCount) {
            warnings.push(
                `Insufficient unassigned loots for charId ${s(charId)} and itemId ${s(itemId)}. ` +
                    `Required: ${s(remainingNeeded)}, Available: ${s(availableCount)}. Assigning ${s(actualAssignCount)} loots.`
            )
        }

        // Assign available loots
        const lootsToAssign = unassignedLoots.slice(0, actualAssignCount)
        for (const loot of lootsToAssign) {
            await lootRepo.assign(charId, loot.id, null)
            // Update the loot in sessionLoots to reflect the assignment (so next filters are up to date)
            const lootIndex = sessionLoots.findIndex((l) => l.id === loot.id)
            if (lootIndex !== -1) {
                const sessionLoot = sessionLoots[lootIndex]
                if (sessionLoot) {
                    sessionLoot.assignedCharacterId = charId
                }
            }
            assignedCount++
        }
    }

    return { assigned: assignedCount, warnings }
}

/**
 * Import loot from MRT (Method Raid Tools) export
 */
export async function importMrtLoot(
    raidSessionId: string,
    data: string
): Promise<{ imported: number; errors: string[] }> {
    const session = await raidSessionRepo.getById(raidSessionId)

    // Date bounds: session date +5 hours
    const dateLowerBound = session.raidDate
    const dateUpperBound = session.raidDate + RAID_SESSION_TIME_WINDOW

    const allItems = await itemRepo.getAll()

    const loots = parseMrtLoots(data, dateLowerBound, dateUpperBound, allItems)

    if (loots.length > 0) {
        const eligibleCharacters = await raidSessionRepo.getRoster(raidSessionId)
        await lootRepo.addMany(raidSessionId, loots, eligibleCharacters)
    }

    return { imported: loots.length, errors: [] }
}

/**
 * Add manually entered loot
 */
export async function addManualLoot(
    raidSessionId: string,
    manualLoots: NewLootManual[]
): Promise<{ imported: number; errors: string[] }> {
    const allItems = await itemRepo.getAll()

    const loots = parseManualLoots(manualLoots, allItems)

    if (loots.length > 0) {
        const eligibleCharacters = await raidSessionRepo.getRoster(raidSessionId)
        await lootRepo.addMany(raidSessionId, loots, eligibleCharacters)
    }

    return { imported: loots.length, errors: [] }
}

// ============== LOOT ASSIGNMENT INFO ==============

/**
 * Retrieve all the information to evaluate the loot assignments
 */
export async function getLootAssignmentInfo(lootId: string): Promise<LootAssignmentInfo> {
    // Step 1: Get loot first to access eligibility
    const loot = await lootRepo.getWithItemById(lootId)

    // Step 2: Get eligible characters (~25 instead of ~200)
    const eligibleChars = await characterRepo.getByIds(loot.charsEligibility)

    // Filter by class eligibility
    const filteredRoster = eligibleChars.filter(
        (character) =>
            loot.item.classes === null || loot.item.classes.includes(character.class)
    )

    // Build lookups for scoped queries
    const charIds = filteredRoster.map((c) => c.id)
    // Step 3: Fetch only data for eligible characters + session loots (not all historical)
    const [
        droptimizers,
        blizzardData,
        simcData,
        sessionLoots,
        bisList,
        itemToTiersetMapping,
    ] = await Promise.all([
        droptimizerRepo.getLatestByCharacterIds(charIds),
        blizzardRepo.getByCharIds(charIds),
        simcRepo.getByCharacterIds(charIds),
        lootRepo.getByRaidSessionIdWithAssigned(loot.raidSessionId),
        bisListRepo.getAll(),
        itemRepo.getTiersetMapping(),
    ])

    // Step 4: Build lookup objects O(1) access by characterId
    const droptimizerByCharId = groupBy(droptimizers, (d) => d.characterId)
    const blizzardByCharId = keyBy(blizzardData, (b) => b.characterId)
    const simcByCharId = keyBy(simcData, (s) => s.characterId)

    const maxGainFromAllDroptimizers = Math.max(
        ...droptimizers.flatMap((item) => item.upgrades.map((upgrade) => upgrade.dps)),
        1 // fallback to avoid -Infinity
    )

    const charAssignmentInfo: CharAssignmentInfo[] = filteredRoster.map((char) => {
        // O(1) lookups by characterId
        const charDroptimizers = droptimizerByCharId[char.id] ?? []
        const charBlizzard = blizzardByCharId[char.id] ?? null
        const charSimc = simcByCharId[char.id] ?? null

        const lowerBound = getLatestSyncDate(charDroptimizers, charBlizzard, charSimc)

        // Filter session loots for this character (much smaller dataset)
        const charAssignedLoots = !lowerBound
            ? []
            : sessionLoots.filter(
                  (l) =>
                      l.id !== loot.id &&
                      l.assignedCharacterId === char.id &&
                      l.dropDate > lowerBound
              )

        const res: Omit<CharAssignmentInfo, "highlights"> = {
            character: char,
            droptimizers: parseDroptimizersInfo(
                loot.item,
                loot.raidDifficulty,
                charDroptimizers
            ),
            weeklyChest: parseGreatVault(charDroptimizers, charSimc),
            tierset: parseTiersetInfo(
                charDroptimizers,
                charAssignedLoots,
                charBlizzard,
                charSimc
            ),
            catalystCharge: parseCatalystCharge(charDroptimizers),
            bestItemsInSlot: parseBestItemInSlot(
                loot.item.slotKey,
                charDroptimizers,
                charAssignedLoots,
                charBlizzard
            ),
            alreadyGotIt: parseLootAlreadyGotIt(
                loot,
                getWowClassFromIdOrName(char.class),
                charDroptimizers,
                charAssignedLoots,
                charBlizzard,
                itemToTiersetMapping
            ),
            bisForSpec: parseLootBisSpecForChar(bisList, loot.item.id, char),
            warnDroptimizer: parseDroptimizerWarn(charDroptimizers, charAssignedLoots),
            warnBlizzard: parseBlizzardWarn(charBlizzard),
        }

        return {
            ...res,
            highlights: evalHighlightsAndScore(loot, res, maxGainFromAllDroptimizers),
        }
    })

    return {
        loot,
        eligible: charAssignmentInfo,
    }
}

/**
 * Get all characters with their gear for a specific item
 */
export async function getCharactersWithLootsByItemId(
    itemId: number
): Promise<CharacterWithGears[]> {
    // Stage 1: Get item and roster to determine eligible characters
    const [item, roster] = await Promise.all([
        itemRepo.getById(itemId),
        characterRepo.getList(),
    ])

    if (item === null) {
        throw new Error("Item not found")
    }

    // Filter to class-eligible characters
    const filteredRoster = roster.filter(
        (character) => item.classes === null || item.classes.includes(character.class)
    )
    const charIds = filteredRoster.map((c) => c.id)

    // Stage 2: Fetch only data for eligible characters (not all tracked characters)
    const [latestDroptimizer, assignedLootsForItem, blizzardData, simcData] =
        await Promise.all([
            droptimizerRepo.getLatestByCharacterIds(charIds),
            lootRepo.getAssignedByItemId(itemId),
            blizzardRepo.getByCharIds(charIds),
            simcRepo.getByCharacterIds(charIds),
        ])

    const droptimizerByCharId = groupBy(latestDroptimizer, (d) => d.characterId)
    const blizzardByCharId = keyBy(blizzardData, (b) => b.characterId)
    const simcByCharId = keyBy(simcData, (s) => s.characterId)

    const res = filteredRoster.map((char) => {
        const charDroptimizers = droptimizerByCharId[char.id] ?? []
        const charBlizzard: CharacterBlizzard | null = blizzardByCharId[char.id] ?? null
        const charSimc: SimC | null = simcByCharId[char.id] ?? null

        const lowerBound = getLatestSyncDate(charDroptimizers, charBlizzard, charSimc)

        const charAssignedLoots = !lowerBound
            ? []
            : assignedLootsForItem.filter(
                  (l) => l.assignedCharacterId === char.id && l.dropDate > lowerBound
              )

        // Get all loots by item ID
        const lastDroptWithTierInfo = charDroptimizers
            .filter((c) => c.itemsInBag.length > 0)
            .sort((a, b) => b.simInfo.date - a.simInfo.date)
            .at(0)

        const lastDroptWithWeeklyChestInfo = charDroptimizers
            .filter((c) => isInCurrentWowWeek(c.simInfo.date) && c.weeklyChest.length > 0)
            .sort((a, b) => b.simInfo.date - a.simInfo.date)
            .at(0)

        const availableGear = [
            ...(lastDroptWithTierInfo?.itemsEquipped ?? []).filter(
                (gi) => gi.item.id === item.id
            ),
            ...(lastDroptWithTierInfo?.itemsInBag ?? []).filter(
                (gi) => gi.item.id === item.id
            ),
            ...(lastDroptWithWeeklyChestInfo?.weeklyChest ?? []).filter(
                (gi) => gi.item.id === item.id
            ),
            ...charAssignedLoots.flatMap((l) =>
                l.gearItem.item.id === item.id ? [l.gearItem] : []
            ),
            ...(charBlizzard?.itemsEquipped ?? []).filter((gi) => gi.item.id === item.id),
        ]

        // Remove duplicate items
        const uniqueGear: typeof availableGear = []
        for (const gear of availableGear) {
            const isDuplicate = uniqueGear.some((existingGear) =>
                gearAreTheSame(gear, existingGear)
            )
            if (!isDuplicate) {
                uniqueGear.push(gear)
            }
        }

        return {
            ...char,
            gears: uniqueGear.sort((a, b) => compareGearItem(b, a)),
        }
    })

    return res
}

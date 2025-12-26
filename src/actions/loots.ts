"use server"

import { getBisList } from "@/db/repositories/bis-list"
import { getCharactersList } from "@/db/repositories/characters"
import { getDroptimizerLatestList } from "@/db/repositories/droptimizer"
import { getItem, getItems, getItemToTiersetMapping } from "@/db/repositories/items"
import {
    addLoots,
    assignLoot,
    deleteLoot,
    getLootAssigned,
    getLootsByRaidSessionId,
    getLootsByRaidSessionIdWithAssigned,
    getLootsByRaidSessionIdsWithAssigned,
    getLootsByRaidSessionIdWithItem,
    getLootWithItemById,
    tradeLoot,
    unassignLoot,
    untradeLoot,
} from "@/db/repositories/loots"
import { getRaidSession, getRaidSessionRoster } from "@/db/repositories/raid-sessions"
import { getAllCharacterRaiderio } from "@/db/repositories/raiderio"
import { getAllSimC } from "@/db/repositories/simc"
import { getAllCharacterWowAudit } from "@/db/repositories/wowaudit"
import {
    evalHighlightsAndScore,
    getLatestSyncDate,
    parseBestItemInSlot,
    parseCatalystCharge,
    parseDroptimizerWarn,
    parseDroptimizersInfo,
    parseGreatVault,
    parseLootAlreadyGotIt,
    parseLootBisSpecForChar,
    parseRaiderioWarn,
    parseTiersetInfo,
    parseWowAuditWarn,
} from "@/lib/loot/loot-utils"
import { parseManualLoots, parseMrtLoots, parseRcLoots } from "@/lib/loots/loot-parsers"
import { s } from "@/lib/safe-stringify"
import { getWowClassFromIdOrName } from "@/shared/libs/spec-parser/spec-utils"
import type { CharacterRaiderio } from "@/shared/schemas/raiderio.schemas"
import type {
    CharAssignmentHighlights,
    CharAssignmentInfo,
    CharacterWowAudit,
    CharacterWithGears,
    Loot,
    LootAssignmentInfo,
    LootWithAssigned,
    LootWithItem,
    NewLoot,
    NewLootManual,
    SimC,
} from "@/shared/types/types"

export async function getLootsBySessionIdAction(raidSessionId: string): Promise<Loot[]> {
    return await getLootsByRaidSessionId(raidSessionId)
}

export async function getLootsBySessionIdWithItemAction(
    raidSessionId: string
): Promise<LootWithItem[]> {
    return await getLootsByRaidSessionIdWithItem(raidSessionId)
}

export async function getLootsBySessionIdWithAssignedAction(
    raidSessionId: string
): Promise<LootWithAssigned[]> {
    return await getLootsByRaidSessionIdWithAssigned(raidSessionId)
}

export async function getLootsBySessionIdsWithAssignedAction(
    raidSessionIds: string[]
): Promise<LootWithAssigned[]> {
    return await getLootsByRaidSessionIdsWithAssigned(raidSessionIds)
}

export async function getLootWithItemByIdAction(lootId: string): Promise<LootWithItem> {
    return await getLootWithItemById(lootId)
}

export async function assignLootAction(
    charId: string,
    lootId: string,
    highlights: CharAssignmentHighlights | null
): Promise<void> {
    await assignLoot(charId, lootId, highlights)
}

export async function unassignLootAction(lootId: string): Promise<void> {
    await unassignLoot(lootId)
}

export async function tradeLootAction(lootId: string): Promise<void> {
    await tradeLoot(lootId)
}

export async function untradeLootAction(lootId: string): Promise<void> {
    await untradeLoot(lootId)
}

export async function deleteLootAction(lootId: string): Promise<void> {
    await deleteLoot(lootId)
}

export async function addLootsAction(
    raidSessionId: string,
    loots: NewLoot[]
): Promise<void> {
    const eligibleCharacters = await getRaidSessionRoster(raidSessionId)
    await addLoots(raidSessionId, loots, eligibleCharacters)
}

// ============== LOOT IMPORT ACTIONS ==============

/**
 * Import loot from RC Loot Council CSV export
 */
export async function importRcLootCsvAction(
    raidSessionId: string,
    csv: string,
    importAssignedCharacter: boolean
): Promise<{ imported: number; errors: string[] }> {
    const session = await getRaidSession(raidSessionId)

    // Date bounds: session date ± 12 hours
    const dateLowerBound = session.raidDate - 12 * 60 * 60
    const dateUpperBound = session.raidDate + 12 * 60 * 60

    const allItems = await getItems()
    const allCharacters = importAssignedCharacter ? await getCharactersList() : []

    const loots = parseRcLoots(
        csv,
        dateLowerBound,
        dateUpperBound,
        importAssignedCharacter,
        allItems,
        allCharacters
    )

    if (loots.length > 0) {
        const eligibleCharacters = await getRaidSessionRoster(raidSessionId)
        await addLoots(raidSessionId, loots, eligibleCharacters)
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
    if (!lootBonusIds || lootBonusIds.length !== targetBonusIds.length) {
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
export async function importRcLootAssignmentsAction(
    raidSessionId: string,
    csv: string
): Promise<{ assigned: number; warnings: string[] }> {
    const session = await getRaidSession(raidSessionId)

    const RAID_SESSION_UPPER_BOUND_DELTA = 12 * 60 * 60

    const allItems = await getItems()
    const allCharacters = await getCharactersList()

    const [rcLootData, sessionLoots] = await Promise.all([
        Promise.resolve(
            parseRcLoots(
                csv,
                session.raidDate,
                session.raidDate + RAID_SESSION_UPPER_BOUND_DELTA,
                true,
                allItems,
                allCharacters
            )
        ),
        getLootsByRaidSessionId(raidSessionId),
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
            await assignLoot(charId, loot.id, null)
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
export async function importMrtLootAction(
    raidSessionId: string,
    data: string
): Promise<{ imported: number; errors: string[] }> {
    const session = await getRaidSession(raidSessionId)

    // Date bounds: session date ± 12 hours
    const dateLowerBound = session.raidDate - 12 * 60 * 60
    const dateUpperBound = session.raidDate + 12 * 60 * 60

    const allItems = await getItems()

    const loots = parseMrtLoots(data, dateLowerBound, dateUpperBound, allItems)

    if (loots.length > 0) {
        const eligibleCharacters = await getRaidSessionRoster(raidSessionId)
        await addLoots(raidSessionId, loots, eligibleCharacters)
    }

    return { imported: loots.length, errors: [] }
}

/**
 * Add manually entered loot
 */
export async function addManualLootAction(
    raidSessionId: string,
    manualLoots: NewLootManual[]
): Promise<{ imported: number; errors: string[] }> {
    const allItems = await getItems()

    const loots = parseManualLoots(manualLoots, allItems)

    if (loots.length > 0) {
        const eligibleCharacters = await getRaidSessionRoster(raidSessionId)
        await addLoots(raidSessionId, loots, eligibleCharacters)
    }

    return { imported: loots.length, errors: [] }
}

// ============== LOOT ASSIGNMENT INFO ==============

/**
 * Retrieve all the information to evaluate the loot assignments
 */
export async function getLootAssignmentInfoAction(
    lootId: string
): Promise<LootAssignmentInfo> {
    const [
        loot,
        roster,
        latestDroptimizer,
        bisList,
        allAssignedLoots,
        wowAuditData,
        raiderioData,
        simcData,
        itemToTiersetMapping,
    ] = await Promise.all([
        getLootWithItemById(lootId),
        getCharactersList(),
        getDroptimizerLatestList(),
        getBisList(),
        getLootAssigned(),
        getAllCharacterWowAudit(),
        getAllCharacterRaiderio(),
        getAllSimC(),
        getItemToTiersetMapping(),
    ])

    const filteredRoster = roster.filter(
        (character) =>
            loot.charsEligibility.includes(character.id) &&
            (loot.item.classes === null || loot.item.classes.includes(character.class))
    )

    const maxGainFromAllDroptimizers = Math.max(
        ...latestDroptimizer.flatMap((item) =>
            item.upgrades.map((upgrade) => upgrade.dps)
        ),
        1 // fallback to avoid -Infinity
    )

    const charAssignmentInfo: CharAssignmentInfo[] = filteredRoster.map((char) => {
        const charDroptimizers = latestDroptimizer.filter(
            (dropt) =>
                dropt.charInfo.name === char.name && dropt.charInfo.server === char.realm
        )

        const charWowAudit: CharacterWowAudit | null =
            wowAuditData.find(
                (wowaudit) => wowaudit.name === char.name && wowaudit.realm === char.realm
            ) ?? null

        const charRaiderio: CharacterRaiderio | null =
            raiderioData.find(
                (raiderio) => raiderio.name === char.name && raiderio.realm === char.realm
            ) ?? null

        const charSimc: SimC | null =
            simcData.find(
                (simc) => simc.charName === char.name && simc.charRealm === char.realm
            ) ?? null

        const lowerBound = getLatestSyncDate(charDroptimizers, null, null, charSimc)

        const charAssignedLoots = !lowerBound
            ? []
            : allAssignedLoots.filter(
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
                charWowAudit,
                charRaiderio,
                charSimc
            ),
            catalystCharge: parseCatalystCharge(charDroptimizers),
            bestItemsInSlot: parseBestItemInSlot(
                loot.item.slotKey,
                charDroptimizers,
                charAssignedLoots,
                charWowAudit,
                charRaiderio
            ),
            alreadyGotIt: parseLootAlreadyGotIt(
                loot,
                getWowClassFromIdOrName(char.class),
                charDroptimizers,
                charAssignedLoots,
                charWowAudit,
                charRaiderio,
                itemToTiersetMapping
            ),
            bisForSpec: parseLootBisSpecForChar(bisList, loot.item.id, char),
            warnDroptimizer: parseDroptimizerWarn(charDroptimizers, charAssignedLoots),
            warnWowAudit: parseWowAuditWarn(charWowAudit),
            warnRaiderio: parseRaiderioWarn(charRaiderio),
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
export async function getCharactersWithLootsByItemIdAction(
    itemId: number
): Promise<CharacterWithGears[]> {
    const { isInCurrentWowWeek } = await import("@/shared/libs/date/date-utils")
    const { gearAreTheSame, compareGearItem } =
        await import("@/shared/libs/items/item-bonus-utils")

    const [
        item,
        roster,
        latestDroptimizer,
        allAssignedLoots,
        wowAuditData,
        raiderioData,
        simcData,
    ] = await Promise.all([
        getItem(itemId),
        getCharactersList(),
        getDroptimizerLatestList(),
        getLootAssigned(),
        getAllCharacterWowAudit(),
        getAllCharacterRaiderio(),
        getAllSimC(),
    ])

    if (item === null) {
        throw new Error("Item not found")
    }

    const filteredRoster = roster.filter(
        (character) => item.classes === null || item.classes.includes(character.class)
    )

    const res = filteredRoster.map((char) => {
        const charDroptimizers = latestDroptimizer.filter(
            (dropt) =>
                dropt.charInfo.name === char.name && dropt.charInfo.server === char.realm
        )

        const charWowAudit: CharacterWowAudit | null =
            wowAuditData.find(
                (wowaudit) => wowaudit.name === char.name && wowaudit.realm === char.realm
            ) ?? null

        const charRaiderio: CharacterRaiderio | null =
            raiderioData.find(
                (raiderio) => raiderio.name === char.name && raiderio.realm === char.realm
            ) ?? null

        const charSimc: SimC | null =
            simcData.find(
                (simc) => simc.charName === char.name && simc.charRealm === char.realm
            ) ?? null

        const lowerBound = getLatestSyncDate(charDroptimizers, null, null, charSimc)

        const charAssignedLoots = !lowerBound
            ? []
            : allAssignedLoots.filter(
                  (l) =>
                      l.itemId === item.id &&
                      l.assignedCharacterId === char.id &&
                      l.dropDate > lowerBound
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
            ...(charWowAudit?.itemsEquipped ?? []).filter((gi) => gi.item.id === item.id),
            ...(charRaiderio?.itemsEquipped ?? []).filter((gi) => gi.item.id === item.id),
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

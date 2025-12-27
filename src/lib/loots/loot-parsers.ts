import { keyBy } from "es-toolkit"
import { parse } from "papaparse"
import { match } from "ts-pattern"
import { z } from "zod"

import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"
import { PROFESSION_TYPES } from "@/shared/consts/wow.consts"
import { getUnixTimestamp } from "@/shared/libs/date/date-utils"
import {
    applyAvoidance,
    applyDiffBonusId,
    applyLeech,
    applySocket,
    applySpeed,
    evalRealSeason,
    getItemTrack,
    parseItemLevelFromRaidDiff,
    parseItemTrack,
} from "@/shared/libs/items/item-bonus-utils"
import {
    getItemBonusString,
    parseItemString,
} from "@/shared/libs/items/item-string-parser"
import {
    rawLootRecordSchema,
    rawMrtRecordSchema,
} from "@/shared/schemas/loot-import.schema"
import { newLootSchema } from "@/shared/schemas/loot.schema"
import type {
    Character,
    GearItem,
    Item,
    ItemTrack,
    NewLoot,
    NewLootManual,
    WowRaidDifficulty,
} from "@/shared/types/types"

const parseWowDiff = (wowDiff: number): WowRaidDifficulty => {
    return match(wowDiff)
        .returnType<WowRaidDifficulty>()
        .with(14, () => "Normal")
        .with(15, () => "Heroic")
        .with(16, () => "Mythic")
        .otherwise(() => "Mythic")
}

const parseDateTime = (dateStr: string, timeStr: string): number => {
    // Split date components (format: YYYY/M/D)
    const [year, month, day] = dateStr.split("/")

    // Create ISO format date string (yyyy-mm-ddTHH:mm:ss)
    const isoDateTime = `${s(year)}-${month?.padStart(2, "0") ?? ""}-${day?.padStart(2, "0") ?? ""}T${s(timeStr)}`

    const dateTime = new Date(isoDateTime)

    if (isNaN(dateTime.getTime())) {
        throw new Error(`Unable to parse date/time: ${dateStr} ${timeStr}`)
    }

    return dateTime.getTime() / 1000
}

/**
 * Parse MRT (Method Raid Tools) loot export
 */
export const parseMrtLoots = (
    csv: string,
    dateLowerBound: number,
    dateUpperBound: number,
    allItemsInDb: Item[]
): NewLoot[] => {
    const lines = csv.split("\n").filter((line) => line.trim() !== "")
    const rawRecords = lines.map((line) => {
        const [
            timeRec,
            encounterID,
            instanceID,
            difficulty,
            playerName,
            classID,
            quantity,
            itemLink,
            rollType,
        ] = line.split("#")
        return {
            timeRec: Number(timeRec),
            encounterID: Number(encounterID),
            instanceID: Number(instanceID),
            difficulty: Number(difficulty),
            playerName,
            classID: Number(classID),
            quantity: Number(quantity),
            itemLink,
            rollType: rollType ? Number(rollType) : null,
        }
    })

    const validatedRecords = z.array(rawMrtRecordSchema).parse(rawRecords)

    const itemsById = keyBy(allItemsInDb, (i) => i.id)

    const res: NewLoot[] = []
    const recordMap = new Map<string, number>()

    for (const record of validatedRecords) {
        try {
            const { timeRec, encounterID, difficulty, quantity, itemLink } = record

            const parsedItem = parseItemString(itemLink)
            if (timeRec < dateLowerBound || timeRec > dateUpperBound) {
                logger.debug(
                    "LootParser",
                    `parseMrtLoots: skipping loot item outside raid session date time ${s(record)}`
                )
                continue
            }
            // Skip items if WuE loot or something else (check Enum.ItemCreationContext)
            if (
                parsedItem.instanceDifficultyId < 3 ||
                parsedItem.instanceDifficultyId > 6
            ) {
                logger.debug(
                    "LootParser",
                    `parseMrtLoots: skipping loot with unwanted instanceDifficultyId # ${s(
                        parsedItem.instanceDifficultyId
                    )}: ${s(record)}`
                )
                continue
            }
            if (quantity > 1) {
                logger.debug(
                    "LootParser",
                    `parseMrtLoots: encounter loot with quantity =${s(
                        quantity
                    )}source: ${s(record)}`
                )
            }

            const itemId = parsedItem.itemID
            const bonusIds = getItemBonusString(parsedItem).split(":").map(Number)
            const wowItem = itemsById[itemId]

            const raidDiff = parseWowDiff(difficulty)

            if (!wowItem) {
                logger.debug(
                    "LootParser",
                    `parseMrtLoots: skipping loot item not in db: ${s(
                        itemId
                    )} https://www.wowhead.com/item=${s(itemId)}?bonus=${s(bonusIds)}`
                )
                continue
            }

            if (wowItem.sourceType !== "raid") {
                logger.debug(
                    "LootParser",
                    `parseMrtLoots: skipping non raid loot: ${s(
                        itemId
                    )} - https://www.wowhead.com/item=${s(itemId)}?bonus=${s(bonusIds)}`
                )
                continue
            }

            const itemTrack = parseItemTrack(bonusIds)
            let itemLevel = 0

            if (itemTrack !== null) {
                itemLevel = itemTrack.itemLevel
            } else {
                // we are dealing with raid items only
                itemLevel = parseItemLevelFromRaidDiff(wowItem, raidDiff)
            }

            const key = `${s(timeRec)}-${s(encounterID)}-${s(difficulty)}-${s(itemId)}`
            const itemIndex = recordMap.get(key) || 0
            recordMap.set(key, itemIndex + 1)

            const id = `${key}-${s(itemIndex)}`

            const gearItem: GearItem = {
                item: {
                    id: wowItem.id,
                    name: wowItem.name,
                    armorType: wowItem.armorType,
                    slotKey: wowItem.slotKey,
                    token: wowItem.token,
                    tierset: wowItem.tierset,
                    boe: wowItem.boe,
                    veryRare: wowItem.veryRare,
                    iconName: wowItem.iconName,
                    season: evalRealSeason(wowItem, itemLevel),
                    specIds: wowItem.specIds,
                },
                source: "loot",
                itemLevel: itemLevel,
                bonusIds: bonusIds,
                itemTrack: itemTrack,
                gemIds: null,
                enchantIds: null,
            }

            const loot: NewLoot = {
                gearItem: gearItem,
                dropDate: timeRec,
                itemString: itemLink,
                raidDifficulty: raidDiff,
                addonId: id,
            }

            res.push(newLootSchema.parse(loot))
        } catch (error) {
            logger.error(
                "LootParser",
                `Error processing MRT record: ${s(record)} - ${s(error)}`
            )
        }
    }

    return res
}

/**
 * Parse RC Loot Council CSV export
 */
export const parseRcLoots = (
    csv: string,
    dateLowerBound: number,
    dateUpperBound: number,
    importAssignedCharacter: boolean,
    allItemsInDb: Item[],
    allCharacters: Character[]
): NewLoot[] => {
    const parsedData = parse(csv, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
    })

    if (parsedData.errors.length > 0) {
        logger.error("LootParser", `parseRcLoots errors: ${s(parsedData.errors)}`)
        throw new Error(
            `Error during parsing RCLoot CSV:${s(parsedData.errors[0]?.message)}`
        )
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- CSV data parsed as records
    const filteredData = (parsedData.data as Record<string, unknown>[]).filter(
        (record) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- CSV field types
            !PROFESSION_TYPES.has(record.subType as string) &&
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- CSV field types
            !(record.response as string | undefined)
                ?.toLowerCase()
                .includes("personal loot")
    )

    const rawRecords = z.array(rawLootRecordSchema).parse(filteredData)

    const itemsById = keyBy(allItemsInDb, (i) => i.id)
    const charsByKey: Record<string, Character> = keyBy(
        allCharacters,
        (c) =>
            `${c.name.toLowerCase()}-${c.realm.toLowerCase().replace("'", "").replace("-", "")}`
    )

    const res: NewLoot[] = []
    const recordMap = new Map<string, number>()

    for (const record of rawRecords) {
        try {
            const parsedItem = parseItemString(record.itemString)
            const { date, time, itemString, difficultyID, itemID: itemId, boss } = record

            const lootUnixTs = parseDateTime(date, time)
            if (lootUnixTs < dateLowerBound || lootUnixTs > dateUpperBound) {
                logger.debug(
                    "LootParser",
                    `parseRcLoots: skipping loot item outside raid session date time ${s(record)}`
                )
                continue
            }
            // Skip items if WuE loot or something else (check Enum.ItemCreationContext)
            if (
                parsedItem.instanceDifficultyId < 3 ||
                parsedItem.instanceDifficultyId > 6
            ) {
                logger.debug(
                    "LootParser",
                    `parseRcLoots: skipping loot with unwanted instanceDifficultyId # ${s(
                        parsedItem.instanceDifficultyId
                    )}: ${s(record)}`
                )
                continue
            }

            const bonusIds = getItemBonusString(parsedItem).split(":").map(Number)
            const wowItem = itemsById[itemId]

            const raidDiff = parseWowDiff(difficultyID)

            if (!wowItem) {
                logger.debug(
                    "LootParser",
                    `parseRcLoots: skipping loot item not in db: ${s(
                        itemId
                    )} https://www.wowhead.com/item=${s(itemId)}?bonus=${s(bonusIds)}`
                )
                continue
            }
            if (wowItem.sourceType !== "raid") {
                logger.debug(
                    "LootParser",
                    `parseRcLoots: skipping non raid loot: ${s(
                        itemId
                    )} - https://www.wowhead.com/item=${s(itemId)}?bonus=${s(bonusIds)}`
                )
                continue
            }

            const itemTrack = parseItemTrack(bonusIds)
            let itemLevel = 0

            if (itemTrack !== null) {
                itemLevel = itemTrack.itemLevel
            } else {
                // we are dealing with raid items only
                itemLevel = parseItemLevelFromRaidDiff(wowItem, raidDiff)
            }

            const key = `${s(lootUnixTs)}-${s(boss)}-${s(difficultyID)}-${s(wowItem.id)}`
            const itemIndex = recordMap.get(key) || 0
            recordMap.set(key, itemIndex + 1)

            const id = `${key}-${s(itemIndex)}`

            const gearItem: GearItem = {
                item: {
                    id: wowItem.id,
                    name: wowItem.name,
                    armorType: wowItem.armorType,
                    slotKey: wowItem.slotKey,
                    token: wowItem.token,
                    tierset: wowItem.tierset,
                    boe: wowItem.boe,
                    veryRare: wowItem.veryRare,
                    iconName: wowItem.iconName,
                    season: evalRealSeason(wowItem, itemLevel),
                    specIds: wowItem.specIds,
                },
                source: "loot",
                itemLevel: itemLevel,
                bonusIds: bonusIds,
                itemTrack: itemTrack,
                gemIds: null,
                enchantIds: null,
            }

            let charAssignment: Character | null = null

            if (importAssignedCharacter) {
                if (!record.player) {
                    logger.debug(
                        "LootParser",
                        `parseRcLoots: importAssignedCharacter is true but item not assigned to any character: ${s(
                            itemId
                        )} - https://www.wowhead.com/item=${s(itemId)}?bonus=${s(bonusIds)}`
                    )
                } else {
                    const charKey = record.player.toLowerCase().replace("'", "")
                    charAssignment = charsByKey[charKey] ?? null
                    if (!charAssignment) {
                        logger.debug(
                            "LootParser",
                            `parseRcLoots: importAssignedCharacter is true but assigned character is not in the roster: ${s(
                                record.player
                            )} - https://www.wowhead.com/item=${s(itemId)}?bonus=${s(bonusIds)}`
                        )
                    }
                }
            }

            const loot: NewLoot = {
                gearItem: gearItem,
                dropDate: lootUnixTs,
                itemString: itemString,
                assignedTo: charAssignment?.id,
                raidDifficulty: raidDiff,
                addonId: id,
            }

            res.push(newLootSchema.parse(loot))
        } catch (error) {
            logger.error(
                "LootParser",
                `Error processing RC record: ${s(record)} - ${s(error)}`
            )
        }
    }

    return res
}

/**
 * Parse manually entered loot
 */
export const parseManualLoots = (
    loots: NewLootManual[],
    allItemsInDb: Item[]
): NewLoot[] => {
    const itemsById = keyBy(allItemsInDb, (i) => i.id)

    const res: NewLoot[] = []

    for (const loot of loots) {
        try {
            const wowItem = itemsById[loot.itemId]

            if (!wowItem) {
                logger.debug(
                    "LootParser",
                    `parseManualLoots: skipping loot item not in db: ${s(
                        loot.itemId
                    )} https://www.wowhead.com/item=${s(loot.itemId)}`
                )
                continue
            }

            const itemLevel = match(loot.raidDifficulty)
                .with("Heroic", () => wowItem.ilvlHeroic)
                .with("Mythic", () => wowItem.ilvlMythic)
                .with("Normal", () => wowItem.ilvlNormal)
                .with("LFR", () => wowItem.ilvlBase)
                .exhaustive()

            const bonusIds: number[] = []

            if (loot.hasSocket) {
                applySocket(bonusIds)
            }
            if (loot.hasAvoidance) {
                applyAvoidance(bonusIds)
            }
            if (loot.hasLeech) {
                applyLeech(bonusIds)
            }
            if (loot.hasSpeed) {
                applySpeed(bonusIds)
            }

            let itemTrack: ItemTrack | null = null
            if (wowItem.token) {
                // apply bonus id to token (Mythic/Heroic tag)
                applyDiffBonusId(bonusIds, loot.raidDifficulty)
            } else {
                itemTrack = getItemTrack(itemLevel, loot.raidDifficulty)
            }

            const gearItem: GearItem = {
                item: {
                    id: wowItem.id,
                    name: wowItem.name,
                    armorType: wowItem.armorType,
                    slotKey: wowItem.slotKey,
                    token: wowItem.token,
                    tierset: wowItem.tierset,
                    boe: wowItem.boe,
                    veryRare: wowItem.veryRare,
                    iconName: wowItem.iconName,
                    season: evalRealSeason(wowItem, itemLevel),
                    specIds: wowItem.specIds,
                },
                source: "loot",
                itemLevel: itemLevel,
                bonusIds: bonusIds,
                itemTrack: itemTrack,
                gemIds: null,
                enchantIds: null,
            }

            const nl: NewLoot = {
                ...loot,
                gearItem: gearItem,
                addonId: null,
                itemString: null,
                dropDate: getUnixTimestamp(), // now
            }

            res.push(newLootSchema.parse(nl))
        } catch (error) {
            logger.error(
                "LootParser",
                `Error processing manual loot: ${s(loot)} - ${s(error)}`
            )
        }
    }

    return res
}

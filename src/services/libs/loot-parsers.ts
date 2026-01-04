import { keyBy } from "es-toolkit"
import { parse } from "papaparse"
import "server-only"
import { match } from "ts-pattern"
import { z } from "zod"
import { logger } from "@/lib/logger"
import { parseWowDifficultyId } from "@/shared/libs/blizzard-mappings"
import { getUnixTimestamp, parseDateTimeFromAddon } from "@/shared/libs/date-utils"
import { createGearItem } from "@/shared/libs/items/gear-item-factory"
import {
    applyAvoidance,
    applyDiffBonusId,
    applyLeech,
    applySocket,
    applySpeed,
    getItemTrack,
    parseItemLevelFromRaidDiff,
    parseItemTrack,
} from "@/shared/libs/items/item-bonus-utils"
import {
    parseItemString,
    type ItemStringData,
} from "@/shared/libs/items/item-string-parser"
import { s } from "@/shared/libs/string-utils"
import type { Character } from "@/shared/models/character.models"
import type { Item } from "@/shared/models/item.models"
import {
    rawLootRecordSchema,
    rawMrtRecordSchema,
} from "@/shared/models/loot-import.models"
import type { NewLoot, NewLootManual } from "@/shared/models/loot.models"
import { PROFESSION_TYPES } from "@/shared/wow.consts"

const getItemBonusString = (itemStringData: ItemStringData): string =>
    itemStringData.bonusIds.join(":")

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
    const recordMap = new Map<string, number>()

    return validatedRecords.flatMap<NewLoot>((record) => {
        try {
            const { timeRec, encounterID, difficulty, quantity, itemLink } = record

            const parsedItem = parseItemString(itemLink)
            if (timeRec < dateLowerBound || timeRec > dateUpperBound) {
                logger.debug(
                    "LootParser",
                    `parseMrtLoots: skipping loot item outside raid session date time ${s(record)}`
                )
                return []
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
                return []
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
            const raidDiff = parseWowDifficultyId(difficulty)

            if (!wowItem) {
                logger.debug(
                    "LootParser",
                    `parseMrtLoots: skipping loot item not in db: ${s(
                        itemId
                    )} https://www.wowhead.com/item=${s(itemId)}?bonus=${s(bonusIds)}`
                )
                return []
            }

            if (wowItem.sourceType !== "raid") {
                logger.debug(
                    "LootParser",
                    `parseMrtLoots: skipping non raid loot: ${s(
                        itemId
                    )} - https://www.wowhead.com/item=${s(itemId)}?bonus=${s(bonusIds)}`
                )
                return []
            }

            const itemTrack = parseItemTrack(bonusIds)
            const itemLevel =
                itemTrack?.itemLevel ?? parseItemLevelFromRaidDiff(wowItem, raidDiff)

            const key = `${s(timeRec)}-${s(encounterID)}-${s(difficulty)}-${s(itemId)}`
            const itemIndex = recordMap.get(key) ?? 0
            recordMap.set(key, itemIndex + 1)

            const id = `${key}-${s(itemIndex)}`

            return {
                gearItem: createGearItem({
                    wowItem,
                    itemLevel,
                    bonusIds,
                    itemTrack,
                    source: "loot",
                }),
                dropDate: timeRec,
                itemString: itemLink,
                raidDifficulty: raidDiff,
                addonId: id,
            }
        } catch (error) {
            logger.error(
                "LootParser",
                `Error processing MRT record: ${s(record)} - ${s(error)}`
            )
            return []
        }
    })
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
    const recordMap = new Map<string, number>()

    const resolveCharAssignment = (
        player: string | undefined | null,
        itemId: number,
        bonusIds: number[]
    ): Character | null => {
        if (!importAssignedCharacter) {
            return null
        }

        if (!player) {
            logger.debug(
                "LootParser",
                `parseRcLoots: importAssignedCharacter is true but item not assigned to any character: ${s(
                    itemId
                )} - https://www.wowhead.com/item=${s(itemId)}?bonus=${s(bonusIds)}`
            )
            return null
        }

        const charKey = player.toLowerCase().replace("'", "")
        const char = charsByKey[charKey] ?? null
        if (!char) {
            logger.debug(
                "LootParser",
                `parseRcLoots: importAssignedCharacter is true but assigned character is not in the roster: ${s(
                    player
                )} - https://www.wowhead.com/item=${s(itemId)}?bonus=${s(bonusIds)}`
            )
        }
        return char
    }

    return rawRecords.flatMap<NewLoot>((record) => {
        try {
            const parsedItem = parseItemString(record.itemString)
            const { date, time, itemString, difficultyID, itemID: itemId, boss } = record

            const lootUnixTs = parseDateTimeFromAddon(date, time)
            if (lootUnixTs < dateLowerBound || lootUnixTs > dateUpperBound) {
                logger.debug(
                    "LootParser",
                    `parseRcLoots: skipping loot item outside raid session date time ${s(record)}`
                )
                return []
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
                return []
            }

            const bonusIds = getItemBonusString(parsedItem).split(":").map(Number)
            const wowItem = itemsById[itemId]
            const raidDiff = parseWowDifficultyId(difficultyID)

            if (!wowItem) {
                logger.debug(
                    "LootParser",
                    `parseRcLoots: skipping loot item not in db: ${s(
                        itemId
                    )} https://www.wowhead.com/item=${s(itemId)}?bonus=${s(bonusIds)}`
                )
                return []
            }
            if (wowItem.sourceType !== "raid") {
                logger.debug(
                    "LootParser",
                    `parseRcLoots: skipping non raid loot: ${s(
                        itemId
                    )} - https://www.wowhead.com/item=${s(itemId)}?bonus=${s(bonusIds)}`
                )
                return []
            }

            const itemTrack = parseItemTrack(bonusIds)
            const itemLevel =
                itemTrack?.itemLevel ?? parseItemLevelFromRaidDiff(wowItem, raidDiff)

            const key = `${s(lootUnixTs)}-${s(boss)}-${s(difficultyID)}-${s(wowItem.id)}`
            const itemIndex = recordMap.get(key) ?? 0
            recordMap.set(key, itemIndex + 1)

            const id = `${key}-${s(itemIndex)}`
            const charAssignment = resolveCharAssignment(record.player, itemId, bonusIds)

            return {
                gearItem: createGearItem({
                    wowItem,
                    itemLevel,
                    bonusIds,
                    itemTrack,
                    source: "loot",
                }),
                dropDate: lootUnixTs,
                itemString: itemString,
                assignedTo: charAssignment?.id,
                raidDifficulty: raidDiff,
                addonId: id,
            }
        } catch (error) {
            logger.error(
                "LootParser",
                `Error processing RC record: ${s(record)} - ${s(error)}`
            )
            return []
        }
    })
}

/**
 * Parse manually entered loot
 */
export const parseManualLoots = (
    loots: NewLootManual[],
    allItemsInDb: Item[]
): NewLoot[] => {
    const itemsById = keyBy(allItemsInDb, (i) => i.id)

    return loots.flatMap<NewLoot>((loot) => {
        try {
            const wowItem = itemsById[loot.itemId]

            if (!wowItem) {
                logger.debug(
                    "LootParser",
                    `parseManualLoots: skipping loot item not in db: ${s(
                        loot.itemId
                    )} https://www.wowhead.com/item=${s(loot.itemId)}`
                )
                return []
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

            // For tokens, apply difficulty bonus but no item track
            // For regular items, get the item track
            if (wowItem.token) {
                applyDiffBonusId(bonusIds, loot.raidDifficulty)
            }
            const itemTrack = wowItem.token
                ? null
                : getItemTrack(itemLevel, loot.raidDifficulty)

            return {
                ...loot,
                gearItem: createGearItem({
                    wowItem,
                    itemLevel,
                    bonusIds,
                    itemTrack,
                    source: "loot",
                }),
                addonId: null,
                itemString: null,
                dropDate: getUnixTimestamp(),
            }
        } catch (error) {
            logger.error(
                "LootParser",
                `Error processing manual loot: ${s(loot)} - ${s(error)}`
            )
            return []
        }
    })
}

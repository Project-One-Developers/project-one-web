import { PROFESSION_TYPES } from '@/shared/consts/wow.consts'
import { getUnixTimestamp } from '@/shared/libs/date/date-utils'
import {
    applyAvoidance,
    applyDiffBonusId,
    applyLeech,
    applySocket,
    applySpeed,
    evalRealSeason,
    getItemTrack,
    parseItemLevelFromRaidDiff,
    parseItemTrack
} from '@/shared/libs/items/item-bonus-utils'
import { getItemBonusString, parseItemString } from '@/shared/libs/items/item-string-parser'
import { rawLootRecordSchema, rawMrtRecordSchema } from '@/shared/schemas/loot-import.schema'
import { newLootSchema } from '@/shared/schemas/loot.schema'
import type {
    Character,
    GearItem,
    Item,
    ItemTrack,
    NewLoot,
    NewLootManual,
    WowRaidDifficulty
} from '@/shared/types/types'
import { parse } from 'papaparse'
import { z } from 'zod'

const parseWowDiff = (wowDiff: number): WowRaidDifficulty => {
    switch (wowDiff) {
        case 14:
            return 'Normal'
        case 15:
            return 'Heroic'
        case 16:
            return 'Mythic'
        default:
            return 'Mythic'
    }
}

const parseDateTime = (dateStr: string, timeStr: string): number => {
    // Split date components (format: YYYY/M/D)
    const [year, month, day] = dateStr.split('/')

    // Create ISO format date string (yyyy-mm-ddTHH:mm:ss)
    const isoDateTime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timeStr}`

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
    const lines = csv.split('\n').filter(line => line.trim() !== '')
    const rawRecords = lines.map(line => {
        const [
            timeRec,
            encounterID,
            instanceID,
            difficulty,
            playerName,
            classID,
            quantity,
            itemLink,
            rollType
        ] = line.split('#')
        return {
            timeRec: Number(timeRec),
            encounterID: Number(encounterID),
            instanceID: Number(instanceID),
            difficulty: Number(difficulty),
            playerName,
            classID: Number(classID),
            quantity: Number(quantity),
            itemLink,
            rollType: rollType ? Number(rollType) : null
        }
    })

    const validatedRecords = z.array(rawMrtRecordSchema).parse(rawRecords)

    const res: NewLoot[] = []
    const recordMap = new Map<string, number>()

    for (const record of validatedRecords) {
        try {
            const { timeRec, encounterID, difficulty, quantity, itemLink } = record

            const parsedItem = parseItemString(itemLink)
            if (timeRec < dateLowerBound || timeRec > dateUpperBound) {
                console.log(
                    'parseMrtLoots: skipping loot item outside raid session date time ' +
                        JSON.stringify(record)
                )
                continue
            }
            // Skip items if WuE loot or something else (check Enum.ItemCreationContext)
            if (parsedItem.instanceDifficultyId < 3 || parsedItem.instanceDifficultyId > 6) {
                console.log(
                    'parseMrtLoots: skipping loot with unwanted instanceDifficultyId # ' +
                        parsedItem.instanceDifficultyId +
                        ': ' +
                        JSON.stringify(record)
                )
                continue
            }
            if (quantity > 1) {
                console.log(
                    'parseMrtLoots: encounter loot with quantity =' +
                        quantity +
                        'source: ' +
                        JSON.stringify(record)
                )
            }

            const itemId = parsedItem.itemID
            const bonusIds = getItemBonusString(parsedItem).split(':').map(Number)
            const wowItem = allItemsInDb.find(i => i.id === itemId)

            const raidDiff = parseWowDiff(difficulty)

            if (!wowItem) {
                console.log(
                    'parseMrtLoots: skipping loot item not in db: ' +
                        itemId +
                        ' https://www.wowhead.com/item=' +
                        itemId +
                        '?bonus=' +
                        bonusIds
                )
                continue
            }

            if (wowItem.sourceType !== 'raid') {
                console.log(
                    'parseMrtLoots: skipping non raid loot: ' +
                        itemId +
                        ' - https://www.wowhead.com/item=' +
                        itemId +
                        '?bonus=' +
                        bonusIds
                )
                continue
            }

            const itemTrack = parseItemTrack(bonusIds)
            let itemLevel: number = 0

            if (itemTrack != null) {
                itemLevel = itemTrack.itemLevel
            } else {
                // we are dealing with raid items only
                itemLevel = parseItemLevelFromRaidDiff(wowItem, raidDiff)
            }

            if (itemLevel == null) {
                console.log(
                    'parseMrtLoots: skipping loot item without ilvl: ' +
                        itemId +
                        ' - https://www.wowhead.com/item=' +
                        itemId +
                        '?bonus=' +
                        bonusIds
                )
                continue
            }

            const key = `${timeRec}-${encounterID}-${difficulty}-${itemId}`
            const itemIndex = recordMap.get(key) || 0
            recordMap.set(key, itemIndex + 1)

            const id = `${key}-${itemIndex}`

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
                    specIds: wowItem.specIds
                },
                source: 'loot',
                itemLevel: itemLevel,
                bonusIds: bonusIds,
                itemTrack: itemTrack,
                gemIds: null,
                enchantIds: null
            }

            const loot: NewLoot = {
                gearItem: gearItem,
                dropDate: timeRec,
                itemString: itemLink,
                raidDifficulty: raidDiff,
                addonId: id
            }

            res.push(newLootSchema.parse(loot))
        } catch (error) {
            console.log('Error processing MRT record:', record, error)
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
        skipEmptyLines: true
    })

    if (!parsedData.data || parsedData.errors.length > 0) {
        console.log(parsedData.errors)
        throw new Error('Error during parsing RCLoot CSV:' + parsedData.errors[0])
    }

    const filteredData = (parsedData.data as Record<string, unknown>[]).filter(
        record =>
            !PROFESSION_TYPES.has(record.subType as string) &&
            !(record.response as string)?.toLowerCase().includes('personal loot')
    )

    const rawRecords = z.array(rawLootRecordSchema).parse(filteredData)
    const res: NewLoot[] = []
    const recordMap = new Map<string, number>()

    for (const record of rawRecords) {
        try {
            const parsedItem = parseItemString(record.itemString)
            const { date, time, itemString, difficultyID, itemID: itemId, boss } = record

            const lootUnixTs = parseDateTime(date, time)
            if (lootUnixTs < dateLowerBound || lootUnixTs > dateUpperBound) {
                console.log(
                    'parseRcLoots: skipping loot item outside raid session date time ' +
                        JSON.stringify(record)
                )
                continue
            }
            // Skip items if WuE loot or something else (check Enum.ItemCreationContext)
            if (parsedItem.instanceDifficultyId < 3 || parsedItem.instanceDifficultyId > 6) {
                console.log(
                    'parseRcLoots: skipping loot with unwanted instanceDifficultyId # ' +
                        parsedItem.instanceDifficultyId +
                        ': ' +
                        JSON.stringify(record)
                )
                continue
            }

            const bonusIds = getItemBonusString(parsedItem).split(':').map(Number)
            const wowItem = allItemsInDb.find(i => i.id === itemId)

            const raidDiff = parseWowDiff(difficultyID)

            if (!wowItem) {
                console.log(
                    'parseRcLoots: skipping loot item not in db: ' +
                        itemId +
                        ' https://www.wowhead.com/item=' +
                        itemId +
                        '?bonus=' +
                        bonusIds
                )
                continue
            }
            if (wowItem.sourceType !== 'raid') {
                console.log(
                    'parseRcLoots: skipping non raid loot: ' +
                        itemId +
                        ' - https://www.wowhead.com/item=' +
                        itemId +
                        '?bonus=' +
                        bonusIds
                )
                continue
            }

            const itemTrack = parseItemTrack(bonusIds)
            let itemLevel: number = 0

            if (itemTrack != null) {
                itemLevel = itemTrack.itemLevel
            } else {
                // we are dealing with raid items only
                itemLevel = parseItemLevelFromRaidDiff(wowItem, raidDiff)
            }

            if (itemLevel == null) {
                console.log(
                    'parseRcLoots: skipping loot item without ilvl: ' +
                        itemId +
                        ' - https://www.wowhead.com/item=' +
                        itemId +
                        '?bonus=' +
                        bonusIds
                )
                continue
            }

            const key = `${lootUnixTs}-${boss}-${difficultyID}-${wowItem.id}`
            const itemIndex = recordMap.get(key) || 0
            recordMap.set(key, itemIndex + 1)

            const id = `${key}-${itemIndex}`

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
                    specIds: wowItem.specIds
                },
                source: 'loot',
                itemLevel: itemLevel,
                bonusIds: bonusIds,
                itemTrack: itemTrack,
                gemIds: null,
                enchantIds: null
            }

            let charAssignment: Character | null = null

            if (importAssignedCharacter) {
                if (!record.player) {
                    console.log(
                        'parseRcLoots: importAssignedCharacter is true but item not assigned to any character: ' +
                            itemId +
                            ' - https://www.wowhead.com/item=' +
                            itemId +
                            '?bonus=' +
                            bonusIds
                    )
                } else {
                    const charnameRealm = record.player.toLowerCase().replace("'", '').split('-')
                    charAssignment =
                        allCharacters.find(
                            c =>
                                c.name.toLowerCase() === charnameRealm[0] &&
                                c.realm.toLowerCase().replace("'", '').replace('-', '') ===
                                    charnameRealm[1]
                        ) || null
                    if (!charAssignment) {
                        console.log(
                            'parseRcLoots: importAssignedCharacter is true but assigned character is not in the roster: ' +
                                record.player +
                                ' - https://www.wowhead.com/item=' +
                                itemId +
                                '?bonus=' +
                                bonusIds
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
                addonId: id
            }

            res.push(newLootSchema.parse(loot))
        } catch (error) {
            console.log('Error processing RC record:', record, error)
        }
    }

    return res
}

/**
 * Parse manually entered loot
 */
export const parseManualLoots = (loots: NewLootManual[], allItemsInDb: Item[]): NewLoot[] => {
    const res: NewLoot[] = []

    for (const loot of loots) {
        try {
            const wowItem = allItemsInDb.find(i => i.id === loot.itemId)

            if (!wowItem) {
                console.log(
                    'parseManualLoots: skipping loot item not in db: ' +
                        loot.itemId +
                        ' https://www.wowhead.com/item=' +
                        loot.itemId
                )
                continue
            }

            let itemLevel
            switch (loot.raidDifficulty) {
                case 'Heroic':
                    itemLevel = wowItem.ilvlHeroic
                    break
                case 'Mythic':
                    itemLevel = wowItem.ilvlMythic
                    break
                case 'Normal':
                    itemLevel = wowItem.ilvlNormal
                    break
                default:
                    itemLevel = wowItem.ilvlBase
                    break
            }

            const bonusIds: number[] = []

            if (loot.hasSocket) applySocket(bonusIds)
            if (loot.hasAvoidance) applyAvoidance(bonusIds)
            if (loot.hasLeech) applyLeech(bonusIds)
            if (loot.hasSpeed) applySpeed(bonusIds)

            let itemTrack: ItemTrack | null = null
            if (wowItem.token) {
                // apply bonus id to token (Mythic/Heroic tag)
                applyDiffBonusId(bonusIds, loot.raidDifficulty)
            } else {
                itemTrack = getItemTrack(itemLevel, loot.raidDifficulty)
            }

            if (itemLevel == null) {
                console.log(
                    'parseManualLoots: skipping loot item without ilvl: ' +
                        loot.itemId +
                        ' - https://www.wowhead.com/item=' +
                        loot.itemId
                )
                continue
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
                    specIds: wowItem.specIds
                },
                source: 'loot',
                itemLevel: itemLevel,
                bonusIds: bonusIds,
                itemTrack: itemTrack,
                gemIds: null,
                enchantIds: null
            }

            const nl: NewLoot = {
                ...loot,
                gearItem: gearItem,
                addonId: null,
                itemString: null,
                dropDate: getUnixTimestamp() // now
            }

            res.push(newLootSchema.parse(nl))
        } catch (error) {
            console.log('Error processing manual loot:', loot, error)
        }
    }

    return res
}

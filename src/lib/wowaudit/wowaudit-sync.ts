/* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- External API parsing with known data structure */
import { getItems } from "@/db/repositories/items"
import type { NewCharacterWowAudit } from "@/db/repositories/wowaudit"
import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"
import { CURRENT_SEASON } from "@/shared/consts/wow.consts"
import {
    applyItemTrackByIlvlAndDelta,
    applyItemTrackByIlvlAndDiff,
    evalRealSeason,
} from "@/shared/libs/items/item-bonus-utils"
import { wowClassNameSchema } from "@/shared/schemas/wow.schemas"
import type {
    GearItem,
    Item,
    ItemTrack,
    WowClassName,
    WowItemEquippedSlotKey,
    WowItemSlotKey,
    WowRaidDifficulty,
} from "@/shared/types/types"

export async function fetchWowAuditData(apiKey: string): Promise<unknown> {
    const responseJson = await fetch(
        `https://data.wowaudit.com/dragonflight/${apiKey}.json`
    )
    if (!responseJson.ok) {
        throw new Error(
            `Failed to fetch JSON data: ${s(responseJson.status)} ${responseJson.statusText}`
        )
    }
    return await responseJson.json()
}

const getNullSafeValue = (data: unknown[], index: number): unknown => {
    const value = data[index]
    return value === null || value === 0 || value === "" || value === "-" ? null : value
}

let itemsInDb: Item[] | null = null

export async function parseWowAuditData(
    jsonData: unknown
): Promise<NewCharacterWowAudit[]> {
    // Ensure jsonData is an array
    if (!Array.isArray(jsonData)) {
        throw new Error("Input data is not an array")
    }

    const firstRow = jsonData[0] as unknown[]
    const wowAuditLastRefresh = firstRow[9] as string
    // Convert the string to a Date object
    const wowAuditLastRefreshDate = new Date(wowAuditLastRefresh)

    // Get the Unix timestamp (in seconds)
    const wowAuditLastRefreshunixTimestamp = Math.floor(
        wowAuditLastRefreshDate.getTime() / 1000
    )

    itemsInDb = await getItems()

    // we skip header
    const res = jsonData.slice(1).map((row) => {
        const charData = row as unknown[]
        const className: WowClassName = wowClassNameSchema.parse(charData[1])
        const wowAuditChar: NewCharacterWowAudit = {
            wowauditLastModifiedUnixTs: wowAuditLastRefreshunixTimestamp, //  when wowaudit refreshed its internal data "2025-01-20 07:27:12 +0100"
            blizzardLastModifiedUnixTs: (charData[128] as number) / 1000, // blizzard_last_modified_unix_ts (millis)
            name: charData[0] as string, // name
            realm: charData[2] as string, // realm_slug
            race: charData[91] as string | null, // race
            guildRank: charData[129] as string | null, // guild_rank
            characterId: charData[133] as number, // character_id

            averageItemLevel: String(charData[3]),

            // Checks
            weekMythicDungeons: charData[105] as number | null, // week_mythic_dungeons
            emptySockets: charData[84] as number | null, // empty_sockets
            enchantQualityWrist: getNullSafeValue(charData, 84) as number | null, // enchant_quality_wrist
            enchantQualityLegs: getNullSafeValue(charData, 85) as number | null, // enchant_quality_legs
            enchantQualityMainHand: getNullSafeValue(charData, 86) as number | null, // enchant_quality_main_hand
            enchantQualityOffHand: getNullSafeValue(charData, 87) as number | null, // enchant_quality_off_hand
            enchantQualityFinger1: getNullSafeValue(charData, 88) as number | null, // enchant_quality_finger_1
            enchantQualityFinger2: getNullSafeValue(charData, 89) as number | null, // enchant_quality_finger_2
            enchantQualityBack: getNullSafeValue(charData, 121) as number | null, // enchant_quality_back

            enchantQualityChest: getNullSafeValue(charData, 122) as number | null, // enchant_quality_chest

            enchantNameBack: getNullSafeValue(charData, 124) as string | null,
            enchantNameChest: getNullSafeValue(charData, 125) as string | null,
            enchantNameWrist: getNullSafeValue(charData, 130) as string | null,
            enchantNameLegs: getNullSafeValue(charData, 131) as string | null,
            enchantNameFeet: getNullSafeValue(charData, 126) as string | null,
            enchantNameFinger1: getNullSafeValue(charData, 118) as string | null,
            enchantNameFinger2: getNullSafeValue(charData, 119) as string | null,
            enchantNameMainHand: getNullSafeValue(charData, 116) as string | null,
            enchantNameOffHand: getNullSafeValue(charData, 117) as string | null,

            enchantQualityFeet: getNullSafeValue(charData, 123) as number | null, // enchant_quality_feet

            highestIlvlEverEquipped: String(charData[132]), // highest_ilvl_ever_equipped

            // great vault
            greatVaultSlot1: getNullSafeValue(charData, 174) as number | null, // great_vault_slot_1
            greatVaultSlot2: getNullSafeValue(charData, 175) as number | null, // great_vault_slot_2
            greatVaultSlot3: getNullSafeValue(charData, 176) as number | null, // great_vault_slot_3
            greatVaultSlot4: getNullSafeValue(charData, 177) as number | null, // great_vault_slot_4
            greatVaultSlot5: getNullSafeValue(charData, 178) as number | null, // great_vault_slot_5
            greatVaultSlot6: getNullSafeValue(charData, 179) as number | null, // great_vault_slot_6
            greatVaultSlot7: getNullSafeValue(charData, 180) as number | null, // great_vault_slot_7
            greatVaultSlot8: getNullSafeValue(charData, 181) as number | null, // great_vault_slot_8
            greatVaultSlot9: getNullSafeValue(charData, 182) as number | null, // great_vault_slot_9

            // Current Equipped
            itemsEquipped: createEquippedInfo(charData),
            // Best Slot ever equipped
            bestItemsEquipped: createBestEquippedInfo(charData),
            // Tiersets info
            tiersetInfo: createTiersetInfo(className, charData),
        }

        return wowAuditChar
    })

    return res
}

function createEquippedInfo(jsonData: unknown[]): GearItem[] {
    const res: GearItem[] = []

    const head = createGearPiece(
        Number(getNullSafeValue(jsonData, 7)),
        Number(getNullSafeValue(jsonData, 6)),
        getNullSafeValue(jsonData, 363) as string | null,
        "head"
    )
    if (head !== null) {
        res.push(head)
    }

    const neck = createGearPiece(
        Number(getNullSafeValue(jsonData, 11)),
        Number(getNullSafeValue(jsonData, 10)),
        getNullSafeValue(jsonData, 364) as string | null,
        "neck"
    )
    if (neck !== null) {
        res.push(neck)
    }

    const shoulder = createGearPiece(
        Number(getNullSafeValue(jsonData, 15)),
        Number(getNullSafeValue(jsonData, 14)),
        getNullSafeValue(jsonData, 365) as string | null,
        "shoulder"
    )
    if (shoulder !== null) {
        res.push(shoulder)
    }

    const back = createGearPiece(
        Number(getNullSafeValue(jsonData, 19)),
        Number(getNullSafeValue(jsonData, 18)),
        getNullSafeValue(jsonData, 366) as string | null,
        "back"
    )
    if (back !== null) {
        res.push(back)
    }

    const chest = createGearPiece(
        Number(getNullSafeValue(jsonData, 23)),
        Number(getNullSafeValue(jsonData, 22)),
        getNullSafeValue(jsonData, 367) as string | null,
        "chest"
    )
    if (chest !== null) {
        res.push(chest)
    }

    const wrist = createGearPiece(
        Number(getNullSafeValue(jsonData, 27)),
        Number(getNullSafeValue(jsonData, 26)),
        getNullSafeValue(jsonData, 368) as string | null,
        "wrist"
    )
    if (wrist !== null) {
        res.push(wrist)
    }

    const hands = createGearPiece(
        Number(getNullSafeValue(jsonData, 31)),
        Number(getNullSafeValue(jsonData, 30)),
        getNullSafeValue(jsonData, 369) as string | null,
        "hands"
    )
    if (hands !== null) {
        res.push(hands)
    }

    const waist = createGearPiece(
        Number(getNullSafeValue(jsonData, 35)),
        Number(getNullSafeValue(jsonData, 34)),
        getNullSafeValue(jsonData, 370) as string | null,
        "waist"
    )
    if (waist !== null) {
        res.push(waist)
    }

    const legs = createGearPiece(
        Number(getNullSafeValue(jsonData, 39)),
        Number(getNullSafeValue(jsonData, 38)),
        getNullSafeValue(jsonData, 371) as string | null,
        "legs"
    )
    if (legs !== null) {
        res.push(legs)
    }

    const feet = createGearPiece(
        Number(getNullSafeValue(jsonData, 43)),
        Number(getNullSafeValue(jsonData, 42)),
        getNullSafeValue(jsonData, 372) as string | null,
        "feet"
    )
    if (feet !== null) {
        res.push(feet)
    }

    const finger1 = createGearPiece(
        Number(getNullSafeValue(jsonData, 47)),
        Number(getNullSafeValue(jsonData, 46)),
        getNullSafeValue(jsonData, 373) as string | null,
        "finger1"
    )
    if (finger1 !== null) {
        res.push(finger1)
    }

    const finger2 = createGearPiece(
        Number(getNullSafeValue(jsonData, 51)),
        Number(getNullSafeValue(jsonData, 50)),
        getNullSafeValue(jsonData, 374) as string | null,
        "finger2"
    )
    if (finger2 !== null) {
        res.push(finger2)
    }

    const trinket1 = createGearPiece(
        Number(getNullSafeValue(jsonData, 55)),
        Number(getNullSafeValue(jsonData, 54)),
        getNullSafeValue(jsonData, 375) as string | null,
        "trinket1"
    )
    if (trinket1 !== null) {
        res.push(trinket1)
    }

    const trinket2 = createGearPiece(
        Number(getNullSafeValue(jsonData, 59)),
        Number(getNullSafeValue(jsonData, 58)),
        getNullSafeValue(jsonData, 376) as string | null,
        "trinket2"
    )
    if (trinket2 !== null) {
        res.push(trinket2)
    }

    const mainHand = createGearPiece(
        Number(getNullSafeValue(jsonData, 63)),
        Number(getNullSafeValue(jsonData, 62)),
        getNullSafeValue(jsonData, 377) as string | null,
        "main_hand"
    )
    if (mainHand !== null) {
        res.push(mainHand)
    }

    const offHand = createGearPiece(
        Number(getNullSafeValue(jsonData, 67)),
        Number(getNullSafeValue(jsonData, 66)),
        getNullSafeValue(jsonData, 378) as string | null,
        "off_hand"
    )
    if (offHand !== null) {
        res.push(offHand)
    }

    return res
}

function createTiersetInfo(className: WowClassName, jsonData: unknown[]): GearItem[] {
    const res: GearItem[] = []

    const head = createTiersetGearPiece(
        className,
        "head",
        Number(getNullSafeValue(jsonData, 265)),
        getNullSafeValue(jsonData, 270) as string | null
    )
    if (head !== null) {
        res.push(head)
    }

    const shoulders = createTiersetGearPiece(
        className,
        "shoulder",
        Number(getNullSafeValue(jsonData, 266)),
        getNullSafeValue(jsonData, 271) as string | null
    )
    if (shoulders !== null) {
        res.push(shoulders)
    }

    const chest = createTiersetGearPiece(
        className,
        "chest",
        Number(getNullSafeValue(jsonData, 267)),
        getNullSafeValue(jsonData, 272) as string | null
    )
    if (chest !== null) {
        res.push(chest)
    }

    const hands = createTiersetGearPiece(
        className,
        "hands",
        Number(getNullSafeValue(jsonData, 268)),
        getNullSafeValue(jsonData, 273) as string | null
    )
    if (hands !== null) {
        res.push(hands)
    }

    const legs = createTiersetGearPiece(
        className,
        "legs",
        Number(getNullSafeValue(jsonData, 269)),
        getNullSafeValue(jsonData, 274) as string | null
    )
    if (legs !== null) {
        res.push(legs)
    }

    return res
}

function createBestEquippedInfo(jsonData: unknown[]): GearItem[] {
    const res: GearItem[] = []

    const head = createGearPiece(
        Number(getNullSafeValue(jsonData, 193)),
        Number(getNullSafeValue(jsonData, 192)),
        null,
        "head"
    )
    if (head !== null) {
        res.push(head)
    }

    const neck = createGearPiece(
        Number(getNullSafeValue(jsonData, 197)),
        Number(getNullSafeValue(jsonData, 196)),
        null,
        "neck"
    )
    if (neck !== null) {
        res.push(neck)
    }

    const shoulder = createGearPiece(
        Number(getNullSafeValue(jsonData, 201)),
        Number(getNullSafeValue(jsonData, 200)),
        null,
        "shoulder"
    )
    if (shoulder !== null) {
        res.push(shoulder)
    }

    const back = createGearPiece(
        Number(getNullSafeValue(jsonData, 205)),
        Number(getNullSafeValue(jsonData, 204)),
        null,
        "back"
    )
    if (back !== null) {
        res.push(back)
    }

    const chest = createGearPiece(
        Number(getNullSafeValue(jsonData, 209)),
        Number(getNullSafeValue(jsonData, 208)),
        null,
        "chest"
    )
    if (chest !== null) {
        res.push(chest)
    }

    const wrist = createGearPiece(
        Number(getNullSafeValue(jsonData, 213)),
        Number(getNullSafeValue(jsonData, 212)),
        null,
        "wrist"
    )
    if (wrist !== null) {
        res.push(wrist)
    }

    const hands = createGearPiece(
        Number(getNullSafeValue(jsonData, 217)),
        Number(getNullSafeValue(jsonData, 216)),
        null,
        "hands"
    )
    if (hands !== null) {
        res.push(hands)
    }

    const waist = createGearPiece(
        Number(getNullSafeValue(jsonData, 221)),
        Number(getNullSafeValue(jsonData, 220)),
        null,
        "waist"
    )
    if (waist !== null) {
        res.push(waist)
    }

    const legs = createGearPiece(
        Number(getNullSafeValue(jsonData, 225)),
        Number(getNullSafeValue(jsonData, 224)),
        null,
        "legs"
    )
    if (legs !== null) {
        res.push(legs)
    }

    const feet = createGearPiece(
        Number(getNullSafeValue(jsonData, 229)),
        Number(getNullSafeValue(jsonData, 228)),
        null,
        "feet"
    )
    if (feet !== null) {
        res.push(feet)
    }

    const finger1 = createGearPiece(
        Number(getNullSafeValue(jsonData, 233)),
        Number(getNullSafeValue(jsonData, 232)),
        null,
        "finger1"
    )
    if (finger1 !== null) {
        res.push(finger1)
    }

    const finger2 = createGearPiece(
        Number(getNullSafeValue(jsonData, 237)),
        Number(getNullSafeValue(jsonData, 236)),
        null,
        "finger2"
    )
    if (finger2 !== null) {
        res.push(finger2)
    }

    const trinket1 = createGearPiece(
        Number(getNullSafeValue(jsonData, 241)),
        Number(getNullSafeValue(jsonData, 240)),
        null,
        "trinket1"
    )
    if (trinket1 !== null) {
        res.push(trinket1)
    }

    const trinket2 = createGearPiece(
        Number(getNullSafeValue(jsonData, 245)),
        Number(getNullSafeValue(jsonData, 244)),
        null,
        "trinket2"
    )
    if (trinket2 !== null) {
        res.push(trinket2)
    }

    const mainHand = createGearPiece(
        Number(getNullSafeValue(jsonData, 249)),
        Number(getNullSafeValue(jsonData, 248)),
        null,
        "main_hand"
    )
    if (mainHand !== null) {
        res.push(mainHand)
    }

    const offHand = createGearPiece(
        Number(getNullSafeValue(jsonData, 253)),
        Number(getNullSafeValue(jsonData, 252)),
        null,
        "off_hand"
    )
    if (offHand !== null) {
        res.push(offHand)
    }

    return res
}

function wowAuditDiffToRealDiff(diff: string | null): WowRaidDifficulty | null {
    if (!diff) {
        return null
    }

    switch (diff) {
        case "H":
            return "Heroic"
        case "N":
            return "Normal"
        case "M":
            return "Mythic"
        case "R":
            return "LFR"
        default:
            throw new Error(`wowAuditDiffToRealDiff: diff not mapped - ${diff}`)
    }
}

function createTiersetGearPiece(
    className: WowClassName,
    slotKey: WowItemSlotKey,
    ilvl: number | null,
    diff: string | null
): GearItem | null {
    if (!ilvl || !itemsInDb || !diff) {
        return null
    }

    const wowItem = itemsInDb.find(
        (i) =>
            i.tierset &&
            i.slotKey === slotKey &&
            i.classes?.includes(className) &&
            i.season === CURRENT_SEASON
    )
    if (!wowItem) {
        logger.debug(
            "WowAudit",
            `createTiersetGearPiece: skipping tierset not detectable for: ${className} - ${slotKey}`
        )
        return null
    }

    const itemDiff = wowAuditDiffToRealDiff(diff)
    const bonusIds: number[] = []
    const itemTrack = itemDiff
        ? applyItemTrackByIlvlAndDiff(bonusIds, ilvl, itemDiff)
        : null

    const res: GearItem = {
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
            season: evalRealSeason(wowItem, ilvl),
            specIds: wowItem.specIds,
        },
        source: "equipped",
        itemLevel: ilvl,
        bonusIds: bonusIds,
        itemTrack,
        gemIds: null,
        enchantIds: null,
    }
    return res
}

function createGearPiece(
    itemId: number | null,
    ilvl: number | null,
    deltaString: string | null,
    equippedInSlot: WowItemEquippedSlotKey | null
): GearItem | null {
    if (!itemId || !ilvl || !itemsInDb) {
        return null
    }
    const wowItem = itemsInDb.find((i) => i.id === itemId)
    if (!wowItem) {
        logger.debug(
            "WowAudit",
            `createGearPiece: skipping equipped item not in db: ${s(
                itemId
            )} https://www.wowhead.com/item=${s(itemId)}`
        )
        return null
    }

    const bonusIds: number[] = []
    let itemTrack: ItemTrack | null = null
    if (deltaString) {
        // wow audit delta is like "4/6".
        // In this example delta is 2 and we need to deduce actual item track by ilvl and delta
        const current = Number(deltaString.split("/")[0])
        const total = Number(deltaString.split("/")[1])
        if (current && total) {
            itemTrack = applyItemTrackByIlvlAndDelta(bonusIds, ilvl, total - current)
        }
    }

    const res: GearItem = {
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
            season: evalRealSeason(wowItem, ilvl),
            specIds: wowItem.specIds,
        },
        source: "equipped",
        equippedInSlot: equippedInSlot ?? undefined,
        itemLevel: ilvl,
        bonusIds: bonusIds,
        itemTrack: itemTrack,
        gemIds: null,
        enchantIds: null,
    }
    return res
}

import { keyBy } from "es-toolkit"
import "server-only"
import { match } from "ts-pattern"
import { z } from "zod"
import { itemRepo } from "@/db/repositories/items"
import { logger } from "@/lib/logger"
import type { SyncContext } from "@/services/droptimizer.service"
import { getUnixTimestamp } from "@/shared/libs/date-utils"
import { evalRealSeason, parseItemTrack } from "@/shared/libs/items/item-bonus-utils"
import { slotToEquippedSlot } from "@/shared/libs/items/item-slot-utils"
import { CURRENT_RAID_ID } from "@/shared/libs/season-config"
import {
    getWowClassFromIdOrName,
    getWowSpecByClassNameAndSpecName,
} from "@/shared/libs/spec-parser/spec-utils"
import { s } from "@/shared/libs/string-utils"
import type {
    GearItem,
    Item,
    ItemToCatalyst,
    ItemToTierset,
    ItemTrack,
} from "@/shared/models/item.models"
import {
    qeLiveURLSchema,
    type NewDroptimizer,
    type NewDroptimizerUpgrade,
} from "@/shared/models/simulation.models"
import {
    wowClassNameSchema,
    wowItemEquippedSlotKeySchema,
    wowSpecNameSchema,
    type WowItemEquippedSlotKey,
    type WowRaidDifficulty,
} from "@/shared/models/wow.models"
import {
    qeliveEquippedItemSchema,
    qeliveJsonSchema,
    type QELiveJson,
} from "./schemas/qelive.schema"

export const fetchDroptimizerFromQELiveURL = async (
    url: string,
    context?: SyncContext
): Promise<NewDroptimizer[]> => {
    const reportUrl = qeLiveURLSchema.parse(url)
    const reportId = reportUrl.split("/").pop()
    if (!reportId) {
        throw new Error("Invalid QE Live URL: Unable to extract report ID")
    }
    const textRawData = await fetchQELiveData(reportId)
    const parsedJson = parseQELiveData(JSON.parse(textRawData))

    const droptimizer = await convertJsonToDroptimizer(url, parsedJson, context)

    return droptimizer
}

const fetchQELiveData = async (id: string): Promise<string> => {
    const responseJson = await fetch(
        `https://questionablyepic.com/api/getUpgradeReport.php?reportID=${id}`
    )
    if (!responseJson.ok) {
        throw new Error(
            `Failed to fetch JSON data: ${s(responseJson.status)} ${responseJson.statusText}`
        )
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- QE Live API returns string
    return (await responseJson.json()) as string
}

const parseQELiveData = (jsonData: unknown): QELiveJson => {
    return qeliveJsonSchema.parse(jsonData)
}

const parseUpgrades = async (
    upgrades: {
        dps: number
        encounterId: number
        itemId: number
        ilvl: number
        slot: WowItemEquippedSlotKey
    }[],
    context?: SyncContext
): Promise<NewDroptimizerUpgrade[]> => {
    // Use context if provided, otherwise fetch from DB
    let tiersetByItemId: Record<string, ItemToTierset>
    let catalystByKey: Record<string, ItemToCatalyst>

    if (context) {
        tiersetByItemId = context.tiersetByItemId
        catalystByKey = context.catalystByKey
    } else {
        const itemToTiersetMapping = await itemRepo.getTiersetMapping()
        const itemToCatalystMapping = await itemRepo.getCatalystMapping()
        tiersetByItemId = keyBy(itemToTiersetMapping, (i) => s(i.itemId))
        catalystByKey = keyBy(
            itemToCatalystMapping,
            (i) => `${s(i.catalyzedItemId)}-${s(i.encounterId)}`
        )
    }

    const upgradesMap = upgrades
        // filter out item without dps gain
        .filter((item) => item.dps > 0)
        // remap itemid to tierset & catalyst
        .map((up) => {
            const tiersetMapping = tiersetByItemId[s(up.itemId)]

            const catalystMapping = !tiersetMapping
                ? catalystByKey[`${s(up.itemId)}-${s(up.encounterId)}`]
                : null

            const res: NewDroptimizerUpgrade = {
                itemId: up.itemId,
                slot: up.slot,
                dps: up.dps,
                ilvl: up.ilvl,
                catalyzedItemId: null,
                tiersetItemId: null,
                ...(tiersetMapping && {
                    itemId: tiersetMapping.tokenId,
                    tiersetItemId: tiersetMapping.itemId,
                }),
                ...(catalystMapping && {
                    itemId: catalystMapping.itemId,
                    catalyzedItemId: catalystMapping.catalyzedItemId,
                }),
            }

            return res
        })
        // for a given itemid upgrade, keep the max dps gain
        .reduce((acc, item) => {
            const existingItem = acc.get(item.itemId)
            if (!existingItem || item.dps > existingItem.dps) {
                acc.set(item.itemId, item)
            }
            return acc
        }, new Map<number, NewDroptimizerUpgrade>())

    return Array.from(upgradesMap.values())
}

/**
 * Parse raid difficulty ID to WowRaidDifficulty enum value
 * @param id - The raid difficulty ID (3=LFR, 4=Normal, 5=Heroic, 6=Mythic)
 * @returns The corresponding WowRaidDifficulty value
 */
export function parseRaidDiff(id: number): WowRaidDifficulty {
    return match(id)
        .returnType<WowRaidDifficulty>()
        .with(4, () => "Heroic")
        .with(5, () => "Heroic") // Heroic (max)
        .with(6, () => "Mythic")
        .with(7, () => "Mythic") // Mythic (max)
        .otherwise((i) => {
            throw new Error(
                `Invalid raid difficulty ID: ${s(i)}. 4-5 (Heroic), or 6-7 (Mythic)`
            )
        })
}

export function parseQELiveSlotToEquippedSlot(slot: string): WowItemEquippedSlotKey {
    if (slot === "1H Weapon") {
        return wowItemEquippedSlotKeySchema.parse("main_hand")
    } else if (slot === "Shield") {
        return wowItemEquippedSlotKeySchema.parse("off_hand")
    } else if (slot === "Finger") {
        return wowItemEquippedSlotKeySchema.parse("finger1")
    } else if (slot === "Trinket") {
        return wowItemEquippedSlotKeySchema.parse("trinket1")
    } else if (slot === "Offhand") {
        return wowItemEquippedSlotKeySchema.parse("off_hand")
    }
    try {
        return wowItemEquippedSlotKeySchema.parse(slot.toLowerCase().replace(" ", "_"))
    } catch {
        throw new Error(`Invalid slot name from QE Live: ${slot}`)
    }
}

/**
 * Converts a date string in format 'YYYY - M - D' to Unix timestamp
 * @param dateString - The date string to parse (e.g., '2025 - 8 - 19')
 * @returns Unix timestamp in seconds
 */
const parseDateToUnixTimestamp = (dateString: string): number => {
    // Remove spaces and split by '-'
    const cleanDateString = dateString.replace(/\s/g, "")
    const parts = cleanDateString.split("-").map(Number)
    const year = parts[0]
    const month = parts[1]
    const day = parts[2]

    if (year === undefined || month === undefined || day === undefined) {
        throw new Error(`Invalid date string format: ${dateString}`)
    }

    // Create date object (month is 0-indexed in JavaScript)
    const date = new Date(year, month - 1, day, 8) // set to 8 AM to avoid timezone issues

    // Validate the parsed date
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date string: ${dateString}`)
    }

    // Return Unix timestamp in seconds
    return Math.floor(date.getTime() / 1000)
}

const convertJsonToDroptimizer = async (
    url: string,
    data: QELiveJson,
    context?: SyncContext
): Promise<NewDroptimizer[]> => {
    const raidId = CURRENT_RAID_ID

    const className = wowClassNameSchema.parse(data.spec.split(" ")[1])
    const wowClass = getWowClassFromIdOrName(className)
    const specName = wowSpecNameSchema.parse(data.spec.split(" ")[0])
    const wowSpec = getWowSpecByClassNameAndSpecName(className, specName)

    if (!wowSpec) {
        throw new Error(`Unknown spec: ${specName} for class ${className}`)
    }

    const charInfo = {
        name: data.playername,
        server: data.realm
            .toLowerCase()
            .replaceAll("_", "-")
            .replaceAll(" ", "-")
            .replaceAll("'", ""),
        class: className,
        classId: wowClass.id,
        spec: specName,
        specId: wowSpec.id,
        talents: "qe_no_support",
    }

    // Use context if provided, otherwise fetch from DB
    const itemsById: Record<number, Item> = context
        ? Object.fromEntries(context.itemsById)
        : keyBy(await itemRepo.getAll(), (i) => i.id)

    const itemsEquipped = parseEquippedGear(itemsById, data.equippedItems, url)

    // Filter results with 0 score and raid only
    const raidResults = data.results.filter((r) => r.rawDiff > 0 && r.dropLoc === "Raid")

    // Group by dropDifficulty
    const resultsByDifficulty = raidResults.reduce<Record<number, typeof raidResults>>(
        (acc, result) => {
            const arr = (acc[result.dropDifficulty] ??= [])
            arr.push(result)
            return acc
        },
        {}
    )

    // Generate one NewDroptimizer per difficulty group
    const droptimizers: NewDroptimizer[] = []

    for (const [difficultyId, difficultyResults] of Object.entries(resultsByDifficulty)) {
        const raidDiff = parseRaidDiff(Number(difficultyId))

        // Transform results to the format expected by parseUpgrades
        const transformedResults = difficultyResults.map((result) => {
            const item = itemsById[result.item]
            if (!item) {
                throw new Error(
                    `[error] convertJsonToDroptimizer: item not found in db: ${s(
                        result.item
                    )} - https://www.wowhead.com/item=${s(result.item)} - URL: ${url}`
                )
            }
            return {
                dps: result.rawDiff, // Using rawDiff as HPS value
                encounterId: item.sourceId, // QE Live doesn't provide encounter ID
                itemId: result.item,
                ilvl: result.level,
                slot: slotToEquippedSlot(item.slotKey),
            }
        })

        const droptimizer: NewDroptimizer = {
            url: `${url}&diff=${raidDiff}`, // in QE there are multiple report for the same url
            charInfo,
            raidInfo: {
                id: raidId,
                difficulty: raidDiff,
            },
            simInfo: {
                date: parseDateToUnixTimestamp(data.dateCreated),
                fightstyle: "Patchwerk", // QE Live does not have fightstyle
                duration: 300,
                nTargets: 1,
                upgradeEquipped: false, // QE Live does not have upgrade equipped
            },
            dateImported: getUnixTimestamp(),
            upgrades: await parseUpgrades(transformedResults, context),
            currencies: [],
            weeklyChest: [], // QE Live doesn't have great vault data
            itemsAverageItemLevelEquipped: null, // QE Live doesn't provide ilvl data
            itemsEquipped,
            itemsInBag: [],
            tiersetInfo: [],
        }

        droptimizers.push(droptimizer)
    }

    return droptimizers
}

export const parseEquippedGear = (
    itemsById: Record<number, Item>,
    equipped: z.infer<typeof qeliveEquippedItemSchema>[],
    url: string
): GearItem[] => {
    const res: GearItem[] = []

    for (const equippedItem of equipped) {
        if (!equippedItem.bonusIDS) {
            throw new Error(
                `[error] parseEquippedGear: found equipped item without bonusIDS ${s(
                    equippedItem.id
                )} - https://www.wowhead.com/item=${s(equippedItem.id)} - URL: ${url}`
            )
        }
        const bonusIds = equippedItem.bonusIDS.split(":").map(Number)
        const wowItem = itemsById[equippedItem.id]
        if (!wowItem) {
            logger.debug(
                "QELiveParser",
                `parseEquippedGear: skipping equipped item not in db: ${s(
                    equippedItem.id
                )} - https://www.wowhead.com/item=${s(equippedItem.id)}?bonus=${bonusIds.join(
                    ":"
                )} - URL: ${url}`
            )
            continue
        }

        let itemTrack: ItemTrack | null = null
        if (
            wowItem.sourceType !== "profession593" &&
            !wowItem.sourceType.startsWith("special")
        ) {
            itemTrack = parseItemTrack(bonusIds)
            if (!itemTrack) {
                logger.warn(
                    "QELiveParser",
                    `parseEquippedGear: found equipped item without item track ${s(
                        equippedItem.id
                    )} - https://www.wowhead.com/item=${s(
                        equippedItem.id
                    )}?bonus=${bonusIds.join(":")} - URL: ${url}`
                )
            }
        }

        res.push({
            item: {
                id: wowItem.id,
                name: wowItem.name,
                armorType: wowItem.armorType,
                slotKey: wowItem.slotKey,
                token: wowItem.token,
                tierset: wowItem.tierset,
                veryRare: wowItem.veryRare,
                iconName: wowItem.iconName,
                season: evalRealSeason(wowItem, equippedItem.level),
                specIds: wowItem.specIds,
            },
            source: "equipped",
            equippedInSlot: parseQELiveSlotToEquippedSlot(equippedItem.slot),
            itemLevel: equippedItem.level,
            bonusIds: equippedItem.bonusIDS ? bonusIds : null,
            enchantIds: null,
            gemIds: equippedItem.gemString
                ? equippedItem.gemString.split(":").map(Number)
                : null,
            itemTrack: itemTrack,
        })
    }
    return res
}

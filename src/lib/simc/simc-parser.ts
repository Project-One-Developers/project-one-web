import { itemRepo } from "@/db/repositories/items"
import { type NewSimC } from "@/db/repositories/simc"
import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"
import { CURRENT_CATALYST_CHARGE_ID } from "@/shared/consts/wow.consts"
import {
    evalRealSeason,
    parseItemLevelFromBonusIds,
    parseItemTrack,
} from "@/shared/libs/items/item-bonus-utils"
import type { GearItem } from "@/shared/models/item.model"
import type { DroptimizerCurrency } from "@/shared/models/simulation.model"
import { wowItemEquippedSlotKeySchema } from "@/shared/models/wow.model"

export async function parseSimC(simc: string): Promise<NewSimC> {
    const itemsInBag = await parseBagGearsFromSimc(simc)
    const itemsEquipped = await parseEquippedGearFromSimc(simc)
    const weeklyChest = await parseGreatVaultFromSimc(simc)

    const { charName, dateGenerated, charRealm, hash } = parseCharacterInfo(simc)

    // Merge currencies from rawFormData and parseCatalystFromSimc
    const upgradeCurrencies = parseCurrenciesFromSimc(simc)
    const catalystCurrencies = parseCatalystFromSimc(simc)
    const mergedCurrencies = [...upgradeCurrencies, ...catalystCurrencies]

    return {
        hash: hash,
        dateGenerated: dateGenerated,
        charName: charName,
        charRealm: charRealm,
        itemsInBag: itemsInBag,
        itemsEquipped: itemsEquipped,
        weeklyChest: weeklyChest,
        currencies: mergedCurrencies,
        tiersetInfo: await parseTiersets(itemsEquipped, itemsInBag),
    }
}

function parseCharacterInfo(simc: string): {
    charName: string
    dateGenerated: number
    charRealm: string
    hash: string
} {
    const lines = simc.split("\n")
    const firstLine = lines[0]

    if (!firstLine) {
        throw new Error("SimC data is empty")
    }

    // Parse first line: # Soulpala - Holy - 2025-08-18 10:05 - EU/Pozzo dell'Eternità
    const firstLineRegex = /^# (.+?) - .+? - (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) - .+$/
    const firstLineMatch = firstLineRegex.exec(firstLine)

    if (!firstLineMatch) {
        throw new Error("Unable to parse character name and date from first line")
    }

    const charName = firstLineMatch[1]
    const dateString = firstLineMatch[2]

    if (!charName || !dateString) {
        throw new Error("Unable to parse character name and date from first line")
    }
    const dateGenerated = parseSimcDateToUnixTimestamp(dateString)

    // Parse realm from server line: server=pozzo_delleternità
    const serverRegex = /^server=(.+)$/m
    const serverMatch = serverRegex.exec(simc)

    const serverValue = serverMatch?.[1]
    if (!serverValue) {
        throw new Error("Unable to parse server/realm from SimC data")
    }

    const charRealm = serverValue.replace("_", "-")

    // Parse checksum: # Checksum: 77a3aabe
    const checksumRegex = /^# Checksum: (.+)$/m
    const checksumMatch = checksumRegex.exec(simc)

    const hash = checksumMatch?.[1]
    if (!hash) {
        throw new Error("Unable to parse checksum from SimC data")
    }

    return {
        charName,
        dateGenerated,
        charRealm,
        hash,
    }
}

export function parseSimcDateToUnixTimestamp(dateString: string): number {
    const parts = dateString.split(" ")
    const datePart = parts[0]
    const timePart = parts[1]

    if (!datePart || !timePart) {
        throw new Error(`Invalid date string format: ${dateString}`)
    }

    // Handle YYYY-MM-DD format
    const dateParts = datePart.split("-").map(Number)
    const timeParts = timePart.split(":").map(Number)
    const year = dateParts[0]
    const month = dateParts[1]
    const day = dateParts[2]
    const hours = timeParts[0]
    const minutes = timeParts[1]

    if (
        year === undefined ||
        month === undefined ||
        day === undefined ||
        hours === undefined ||
        minutes === undefined
    ) {
        throw new Error(`Invalid date string format: ${dateString}`)
    }

    const date = new Date(year, month - 1, day, hours, minutes)

    // Validate the parsed date
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date string: ${dateString}`)
    }

    return Math.floor(date.getTime() / 1000)
}

function parseCatalystFromSimc(simc: string): DroptimizerCurrency[] {
    const catalystRegex = /# catalyst_currencies=([^\n]+)/
    const match = catalystRegex.exec(simc)

    const catalystData = match?.[1]
    if (!catalystData) {
        return []
    }

    const currencies: DroptimizerCurrency[] = []

    // Split by '/' to get individual currency entries
    const currencyEntries = catalystData.split("/")

    for (const entry of currencyEntries) {
        // Split by ':' to get id and amount
        const [idStr, amountStr] = entry.split(":")

        if (idStr && amountStr) {
            const id = parseInt(idStr, 10)
            const amount = parseInt(amountStr, 10)

            if (
                !isNaN(id) &&
                !isNaN(amount) &&
                CURRENT_CATALYST_CHARGE_ID === id &&
                amount > 0
            ) {
                // track only catalyst from active season
                currencies.push({
                    type: "currency", // used to compose wowhead href
                    id: id,
                    amount: amount,
                })
            }
        }
    }

    return currencies
}

function parseCurrenciesFromSimc(simc: string): DroptimizerCurrency[] {
    const currenciesRegex = /# upgrade_currencies=([^\n]+)/
    const match = currenciesRegex.exec(simc)

    const currencyData = match?.[1]
    if (!currencyData) {
        return []
    }

    const currencies: DroptimizerCurrency[] = []

    // Split by '/' to get individual currency entries
    const currencyEntries = currencyData.split("/")

    for (const entry of currencyEntries) {
        // Split by ':' to get id and amount
        const [type, idStr, amountStr] = entry.split(":")

        if (type && idStr && amountStr) {
            const id = parseInt(idStr, 10)
            const amount = parseInt(amountStr, 10)

            if (!isNaN(id) && !isNaN(amount)) {
                currencies.push({
                    type: type === "c" ? "currency" : "item", // used to compose wowhead href
                    id: id,
                    amount: amount,
                })
            }
        }
    }

    return currencies
}

async function parseGreatVaultFromSimc(simc: string): Promise<GearItem[]> {
    const rewardSectionRegex =
        /### Weekly Reward Choices\n([\s\S]*?)\n### End of Weekly Reward Choices/
    const match = rewardSectionRegex.exec(simc)
    const matchContent = match?.[1]

    if (!matchContent) {
        return []
    }

    const items: GearItem[] = []
    const itemsInDb = await itemRepo.getAll()

    // Create a Map for O(1) lookups instead of O(n) array.find()
    const itemsMap = new Map(itemsInDb.map((item) => [item.id, item]))

    // Simple regex to match gear lines only
    const gearRegex = /^#.*?id=(\d+),bonus_id=([\d/]+)/gm
    let gearMatch: RegExpExecArray | null

    while ((gearMatch = gearRegex.exec(matchContent)) !== null) {
        const itemIdStr = gearMatch[1]
        const bonusIdsStr = gearMatch[2]
        if (!itemIdStr || !bonusIdsStr) {
            continue
        }

        const itemId = parseInt(itemIdStr, 10)
        const bonusIds = bonusIdsStr.split("/").map(Number)

        const wowItem = itemsMap.get(itemId)

        if (!wowItem) {
            logger.warn(
                "SimcParser",
                `parseGreatVaultFromSimc: Skipping weekly reward for item ${s(itemId)} - https://www.wowhead.com/item=${s(itemId)}?bonus=${bonusIds.join(":")}`
            )
            continue
        }

        const itemTrack = parseItemTrack(bonusIds)
        if (!itemTrack) {
            throw new Error(
                `parseGreatVaultFromSimc: Detected Vault item without item track... check import ${s(itemId)} - https://www.wowhead.com/item=${s(itemId)}?bonus=${bonusIds.join(":")}`
            )
        }

        // Use item level from item track
        const itemLevel = itemTrack.itemLevel

        items.push({
            item: {
                id: itemId,
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
            source: "great-vault",
            itemLevel,
            bonusIds,
            enchantIds: null,
            gemIds: null,
            itemTrack,
        })
    }

    return items
}

async function parseTiersets(
    equipped: GearItem[],
    bags: GearItem[]
): Promise<GearItem[]> {
    const tiersetItems = await itemRepo.getTiersetAndTokenList()

    const tiersetItemIds = new Set(tiersetItems.map((item) => item.id))

    const allItems = [...equipped, ...bags]

    return allItems.filter((item) => tiersetItemIds.has(item.item.id))
}

async function parseBagGearsFromSimc(simc: string): Promise<GearItem[]> {
    // Extract "Gear from Bags" section
    const gearSectionMatch = /Gear from Bags[\s\S]*?(?=\n\n|$)/.exec(simc)
    if (!gearSectionMatch) {
        logger.debug("SimcParser", "Unable to find 'Gear from Bags' section.")
        return []
    }

    const gearSection = gearSectionMatch[0]
    const itemLines = gearSection.split("\n").filter((line) => line.includes("="))

    const itemsInDb = await itemRepo.getAll()
    const items: GearItem[] = []

    for (const line of itemLines) {
        const slotMatch = /^# ([a-zA-Z_]+\d?)=/.exec(line)
        const itemIdMatch = /,id=(\d+)/.exec(line)
        const enchantIdMatch = /enchant_id=([\d/]+)/.exec(line)
        const gemIdMatch = /gem_id=([\d/]+)/.exec(line)
        const bonusIdMatch = /bonus_id=([\d/]+)/.exec(line)
        const craftedStatsMatch = /crafted_stats=([\d/]+)/.exec(line)
        const craftingQualityMatch = /crafting_quality=([\d/]+)/.exec(line)

        const itemIdStr = itemIdMatch?.[1]
        const bonusIdStr = bonusIdMatch?.[1]
        if (slotMatch && itemIdStr && bonusIdStr) {
            const itemId = parseInt(itemIdStr, 10)
            const bonusIds = bonusIdStr.split("/").map(Number)
            const wowItem = itemsInDb.find((i) => i.id === itemId)

            if (!wowItem) {
                logger.debug(
                    "SimcParser",
                    `parseBagGearsFromSimc: skipping bag item not in db: ${s(
                        itemId
                    )} https://www.wowhead.com/item=${s(itemId)}`
                )
                continue
            }

            const itemTrack = parseItemTrack(bonusIds)

            let itemLevel: number | null = null
            if (itemTrack !== null) {
                itemLevel = itemTrack.itemLevel
            } else {
                itemLevel = parseItemLevelFromBonusIds(wowItem, bonusIds)
            }

            if (itemLevel === null) {
                logger.debug(
                    "SimcParser",
                    `parseBagGearsFromSimc: skipping bag item without ilvl: ${s(
                        itemId
                    )} - https://www.wowhead.com/item=${s(itemId)}?bonus=${bonusIds.join(
                        ":"
                    )}`
                )
                continue
            }

            const gemIdStr = gemIdMatch?.[1]
            const enchantIdStr = enchantIdMatch?.[1]
            const craftedStatsStr = craftedStatsMatch?.[1]
            const craftingQualityStr = craftingQualityMatch?.[1]

            const item: GearItem = {
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
                source: "bag",
                itemLevel: itemLevel,
                bonusIds: bonusIds,
                itemTrack: itemTrack,
                gemIds: gemIdStr ? gemIdStr.split("/").map(Number) : null,
                enchantIds: enchantIdStr ? enchantIdStr.split("/").map(Number) : null,
            }
            if (craftedStatsStr) {
                item.craftedStats = craftedStatsStr
            }
            if (craftingQualityStr) {
                item.craftingQuality = craftingQualityStr
            }

            items.push(item)
        }
    }

    return items
}

async function parseEquippedGearFromSimc(simc: string): Promise<GearItem[]> {
    // Define valid equipment slots
    const equippedSlots = [
        "head",
        "neck",
        "shoulder",
        "back",
        "chest",
        "wrist",
        "hands",
        "waist",
        "legs",
        "feet",
        "finger1",
        "finger2",
        "trinket1",
        "trinket2",
        "main_hand",
        "off_hand",
    ]

    // Create a regex pattern that matches any equipped slot followed by gear data
    // This will match lines like: head=,id=123456,bonus_id=1/2/3...
    const equippedSlotPattern = `(${equippedSlots.join("|")})`
    const equipmentRegex = new RegExp(`^${equippedSlotPattern}=.*?,id=(\\d+).*$`, "gm")

    const itemsInDb = await itemRepo.getAll()
    const items: GearItem[] = []
    let match: RegExpExecArray | null

    while ((match = equipmentRegex.exec(simc)) !== null) {
        const fullLine = match[0]
        const slotKey = match[1]
        const itemIdStr = match[2]
        if (!slotKey || !itemIdStr) {
            continue
        }

        const itemId = parseInt(itemIdStr, 10)
        const bonusIdsMatch = /bonus_id=([\d/]+)/.exec(fullLine)
        const bonusIdsStr = bonusIdsMatch?.[1]

        // Skip if no bonus_id (required for processing)
        if (!bonusIdsStr) {
            continue
        }

        const bonusIds = bonusIdsStr.split("/").map(Number)

        // Extract other properties from the full line
        const enchantIdMatch = /enchant_id=([\d/]+)/.exec(fullLine)
        const gemIdMatch = /gem_id=([\d/]+)/.exec(fullLine)
        const craftedStatsMatch = /crafted_stats=([\d/]+)/.exec(fullLine)
        const craftingQualityMatch = /crafting_quality=([\d/]+)/.exec(fullLine)

        const wowItem = itemsInDb.find((i) => i.id === itemId)

        if (!wowItem) {
            logger.debug(
                "SimcParser",
                `parseEquippedGearFromSimc: skipping equipped item not in db: ${s(
                    itemId
                )} https://www.wowhead.com/item=${s(itemId)}`
            )
            continue
        }

        const itemTrack = parseItemTrack(bonusIds)

        let itemLevel: number | null = null
        if (itemTrack !== null) {
            itemLevel = itemTrack.itemLevel
        } else {
            itemLevel = parseItemLevelFromBonusIds(wowItem, bonusIds)
        }

        if (itemLevel === null) {
            logger.debug(
                "SimcParser",
                `parseEquippedGearFromSimc: skipping equipped item without ilvl: ${s(
                    itemId
                )} - https://www.wowhead.com/item=${s(itemId)}?bonus=${bonusIds.join(":")}`
            )
            continue
        }

        const gemIdStr = gemIdMatch?.[1]
        const enchantIdStr = enchantIdMatch?.[1]
        const craftedStatsStr = craftedStatsMatch?.[1]
        const craftingQualityStr = craftingQualityMatch?.[1]

        const item: GearItem = {
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
            source: "equipped",
            equippedInSlot: wowItemEquippedSlotKeySchema.parse(slotKey),
            itemLevel: itemLevel,
            bonusIds: bonusIds,
            itemTrack: itemTrack,
            gemIds: gemIdStr ? gemIdStr.split("/").map(Number) : null,
            enchantIds: enchantIdStr ? enchantIdStr.split("/").map(Number) : null,
        }

        if (craftedStatsStr) {
            item.craftedStats = craftedStatsStr
        }
        if (craftingQualityStr) {
            item.craftingQuality = craftingQualityStr
        }

        items.push(item)
    }

    return items
}

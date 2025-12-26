import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"
import { CURRENT_CATALYST_CHARGE_ID } from "@/shared/consts/wow.consts"
import {
    evalRealSeason,
    parseItemLevelFromBonusIds,
    parseItemTrack,
} from "@/shared/libs/items/item-bonus-utils"
import type { DroptimizerCurrency, GearItem, Item } from "@/shared/types/types"
import { getItems, getTiersetAndTokenList } from "@/db/repositories/items"

export const parseCatalystFromSimc = (simc: string): DroptimizerCurrency[] => {
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

export const parseGreatVaultFromSimc = async (simc: string): Promise<GearItem[]> => {
    const rewardSectionRegex =
        /### Weekly Reward Choices\n([\s\S]*?)\n### End of Weekly Reward Choices/
    const match = rewardSectionRegex.exec(simc)
    const matchContent = match?.[1]

    if (!matchContent) {
        return []
    }

    const items: GearItem[] = []
    const itemsInDb: Item[] = await getItems()

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

export const parseTiersets = async (
    equipped: GearItem[],
    bags: GearItem[]
): Promise<GearItem[]> => {
    const tiersetItems = await getTiersetAndTokenList()

    const tiersetItemIds = new Set(tiersetItems.map((item) => item.id))

    const allItems = [...equipped, ...bags]

    return allItems.filter((item) => tiersetItemIds.has(item.item.id))
}

export async function parseBagGearsFromSimc(simc: string): Promise<GearItem[]> {
    // Extract "Gear from Bags" section
    const gearSectionMatch = /Gear from Bags[\s\S]*?(?=\n\n|$)/.exec(simc)
    if (!gearSectionMatch) {
        logger.debug("SimcParser", "Unable to find 'Gear from Bags' section.")
        return []
    }

    const gearSection = gearSectionMatch[0]
    const itemLines = gearSection.split("\n").filter((line) => line.includes("="))

    const itemsInDb: Item[] = await getItems()
    const items: GearItem[] = []

    for (const line of itemLines) {
        const slotMatch = /^# ([a-zA-Z_]+\d?)=/.exec(line)
        const itemIdMatch = /,id=(\d+)/.exec(line)
        const bonusIdMatch = /bonus_id=([\d/]+)/.exec(line)
        const enchantIdMatch = /enchant_id=([\d/]+)/.exec(line)
        const gemIdMatch = /gem_id=([\d/]+)/.exec(line)
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

import { CURRENT_CATALYST_CHARGE_ID } from '@/shared/consts/wow.consts'
import {
    evalRealSeason,
    parseItemLevelFromBonusIds,
    parseItemTrack
} from '@/shared/libs/items/item-bonus-utils'
import { wowItemEquippedSlotKeySchema } from '@/shared/schemas/wow.schemas'
import type { DroptimizerCurrency, GearItem, Item } from '@/shared/types/types'
import { getItems, getTiersetAndTokenList } from '@/db/repositories/items'

export const parseCatalystFromSimc = async (simc: string): Promise<DroptimizerCurrency[]> => {
    const catalystRegex = /# catalyst_currencies=([^\n]+)/
    const match = simc.match(catalystRegex)

    if (!match) {
        return []
    }

    const catalystData = match[1]
    const currencies: DroptimizerCurrency[] = []

    // Split by '/' to get individual currency entries
    const currencyEntries = catalystData.split('/')

    for (const entry of currencyEntries) {
        // Split by ':' to get id and amount
        const [idStr, amountStr] = entry.split(':')

        if (idStr && amountStr) {
            const id = parseInt(idStr, 10)
            const amount = parseInt(amountStr, 10)

            if (!isNaN(id) && !isNaN(amount) && CURRENT_CATALYST_CHARGE_ID === id && amount > 0) {
                // track only catalyst from active season
                currencies.push({
                    type: 'currency', // used to compose wowhead href
                    id: id,
                    amount: amount
                })
            }
        }
    }

    return currencies
}

export const parseGreatVaultFromSimc = async (simc: string): Promise<GearItem[]> => {
    const rewardSectionRegex =
        /### Weekly Reward Choices\n([\s\S]*?)\n### End of Weekly Reward Choices/
    const match = simc.match(rewardSectionRegex)

    if (!match) return []

    const items: GearItem[] = []
    const itemsInDb: Item[] = await getItems()

    // Create a Map for O(1) lookups instead of O(n) array.find()
    const itemsMap = new Map(itemsInDb.map(item => [item.id, item]))

    // Simple regex to match gear lines only
    const gearRegex = /^#.*?id=(\d+),bonus_id=([\d/]+)/gm
    let gearMatch: RegExpExecArray | null

    while ((gearMatch = gearRegex.exec(match[1])) !== null) {
        const itemId = parseInt(gearMatch[1], 10)
        const bonusIds = gearMatch[2].split('/').map(Number)

        const wowItem = itemsMap.get(itemId)

        if (!wowItem) {
            console.log(
                `[warn] parseGreatVaultFromSimc: Skipping weekly reward for item ${itemId} - https://www.wowhead.com/item=${itemId}?bonus=${bonusIds.join(':')}`
            )
            continue
        }

        const itemTrack = parseItemTrack(bonusIds)
        if (!itemTrack) {
            throw new Error(
                `parseGreatVaultFromSimc: Detected Vault item without item track... check import ${itemId} - https://www.wowhead.com/item=${itemId}?bonus=${bonusIds.join(':')}`
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
                specIds: wowItem.specIds
            },
            source: 'great-vault',
            itemLevel,
            bonusIds,
            enchantIds: null,
            gemIds: null,
            itemTrack
        })
    }

    return items
}

export const parseTiersets = async (equipped: GearItem[], bags: GearItem[]): Promise<GearItem[]> => {
    const tiersetItems = await getTiersetAndTokenList()

    const tiersetItemIds = new Set(tiersetItems.map(item => item.id))

    const allItems = [...equipped, ...bags]

    return allItems.filter(item => tiersetItemIds.has(item.item.id))
}

export async function parseBagGearsFromSimc(simc: string): Promise<GearItem[]> {
    // Extract "Gear from Bags" section
    const gearSectionMatch = simc.match(/Gear from Bags[\s\S]*?(?=\n\n|$)/)
    if (!gearSectionMatch) {
        console.log("Unable to find 'Gear from Bags' section.")
        return []
    }

    const gearSection = gearSectionMatch[0]
    const itemLines = gearSection.split('\n').filter(line => line.includes('='))

    const itemsInDb: Item[] = await getItems()
    const items: GearItem[] = []

    for (const line of itemLines) {
        const slotMatch = line.match(/^# ([a-zA-Z_]+\d?)=/)
        const itemIdMatch = line.match(/,id=(\d+)/)
        const bonusIdMatch = line.match(/bonus_id=([\d/]+)/)
        const enchantIdMatch = line.match(/enchant_id=([\d/]+)/)
        const gemIdMatch = line.match(/gem_id=([\d/]+)/)
        const craftedStatsMatch = line.match(/crafted_stats=([\d/]+)/)
        const craftingQualityMatch = line.match(/crafting_quality=([\d/]+)/)

        if (slotMatch && itemIdMatch && bonusIdMatch) {
            const itemId = parseInt(itemIdMatch[1], 10)
            const bonusIds = bonusIdMatch[1].split('/').map(Number)
            const wowItem = itemsInDb.find(i => i.id === itemId)

            if (wowItem == null) {
                console.log(
                    'parseBagGearsFromSimc: skipping bag item not in db: ' +
                        itemId +
                        ' https://www.wowhead.com/item=' +
                        itemId
                )
                continue
            }

            const itemTrack = parseItemTrack(bonusIds)

            let itemLevel: number | null = null
            if (itemTrack != null) {
                itemLevel = itemTrack.itemLevel
            } else {
                itemLevel = parseItemLevelFromBonusIds(wowItem, bonusIds)
            }

            if (itemLevel == null) {
                console.log(
                    'parseBagGearsFromSimc: skipping bag item without ilvl: ' +
                        itemId +
                        ' - https://www.wowhead.com/item=' +
                        itemId +
                        '?bonus=' +
                        bonusIds.join(':')
                )
                continue
            }

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
                    specIds: wowItem.specIds
                },
                source: 'bag',
                itemLevel: itemLevel,
                bonusIds: bonusIds,
                itemTrack: itemTrack,
                gemIds: gemIdMatch ? gemIdMatch[1].split('/').map(Number) : null,
                enchantIds: enchantIdMatch ? enchantIdMatch[1].split('/').map(Number) : null
            }
            if (craftedStatsMatch) item.craftedStats = craftedStatsMatch[1]
            if (craftingQualityMatch) item.craftingQuality = craftingQualityMatch[1]

            items.push(item)
        }
    }

    return items
}

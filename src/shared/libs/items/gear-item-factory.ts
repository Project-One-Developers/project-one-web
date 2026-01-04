import type { GearItem, Item, ItemTrack } from "@/shared/models/item.models"
import type { WowItemEquippedSlotKey } from "@/shared/models/wow.models"
import { evalRealSeason } from "./item-bonus-utils"

export type CreateGearItemParams = {
    wowItem: Item
    itemLevel: number
    bonusIds: number[]
    itemTrack: ItemTrack | null
    source: GearItem["source"]
    equippedInSlot?: WowItemEquippedSlotKey
    gemIds?: number[] | null
    enchantIds?: number[] | null
}

export const createGearItem = ({
    wowItem,
    itemLevel,
    bonusIds,
    itemTrack,
    source,
    equippedInSlot,
    gemIds = null,
    enchantIds = null,
}: CreateGearItemParams): GearItem => ({
    item: {
        id: wowItem.id,
        name: wowItem.name,
        armorType: wowItem.armorType,
        slotKey: wowItem.slotKey,
        token: wowItem.token,
        tierset: wowItem.tierset,
        veryRare: wowItem.veryRare,
        iconName: wowItem.iconName,
        season: evalRealSeason(wowItem, itemLevel),
        specIds: wowItem.specIds,
    },
    source,
    itemLevel,
    bonusIds,
    itemTrack,
    gemIds,
    enchantIds,
    ...(equippedInSlot && { equippedInSlot }),
})

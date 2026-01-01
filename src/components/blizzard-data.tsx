"use client"

import type { CharacterBlizzard } from "@/shared/models/blizzard.models"
import type { GearItem } from "@/shared/models/item.models"
import type { WowItemEquippedSlotKey } from "@/shared/models/wow.models"
import CharacterGearLayout from "./character-gear-layout"
import BaseGearSlot, { createGearSlotMapping } from "./wow/character-paperdoll-gearslot"

type BlizzardDataProps = {
    data: CharacterBlizzard
    tiersetInfo?: GearItem[]
}

export default function BlizzardData({ data, tiersetInfo }: BlizzardDataProps) {
    const gearBySlot = createGearSlotMapping(data.itemsEquipped)

    const renderGearSlot = (
        slotKey: WowItemEquippedSlotKey,
        options?: { rightSide?: boolean }
    ) => {
        const equippedItem = gearBySlot[slotKey]

        return (
            <BaseGearSlot
                equippedItem={equippedItem}
                showExtendedInfo={true}
                showTierBanner={true}
                rightSide={options?.rightSide}
                flipExtendedInfo={options?.rightSide}
            />
        )
    }

    return (
        <CharacterGearLayout renderGearSlot={renderGearSlot} tiersetInfo={tiersetInfo} />
    )
}

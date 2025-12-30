"use client"

import type { CharacterBlizzard } from "@/shared/models/blizzard.model"
import type { WowItemEquippedSlotKey } from "@/shared/models/wow.model"
import CharacterGearLayout from "./character-gear-layout"
import BaseGearSlot, { createGearSlotMapping } from "./wow/character-paperdoll-gearslot"

export default function BlizzardData({ data }: { data: CharacterBlizzard }) {
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

    return <CharacterGearLayout renderGearSlot={renderGearSlot} />
}

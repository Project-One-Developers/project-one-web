"use client"

import type { Droptimizer } from "@/shared/models/simulation.models"
import type { WowItemEquippedSlotKey } from "@/shared/models/wow.models"
import CharacterGearLayout from "./character-gear-layout"
import BaseGearSlot, { createGearSlotMapping } from "./wow/character-paperdoll-gearslot"

export default function DroptimizerData({ data }: { data: Droptimizer }) {
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
        <CharacterGearLayout
            renderGearSlot={renderGearSlot}
            tiersetInfo={data.tiersetInfo}
        />
    )
}

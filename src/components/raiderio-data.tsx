"use client"

import type { CharacterRaiderio } from "@/shared/models/raiderio.model"
import type { WowItemEquippedSlotKey } from "@/shared/models/wow.model"
import CharacterPaperdoll from "./wow/character-paperdoll"
import BaseGearSlot, { createGearSlotMapping } from "./wow/character-paperdoll-gearslot"

export default function RaiderioData({ data }: { data: CharacterRaiderio }) {
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
        <div className="w-full space-y-8">
            <CharacterPaperdoll renderGearSlot={renderGearSlot} />
        </div>
    )
}

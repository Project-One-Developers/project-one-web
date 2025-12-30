"use client"

import type { WowItemEquippedSlotKey } from "@/shared/models/wow.model"
import type { CharacterWowAudit } from "@/shared/models/wowaudit.model"
import CharacterGearLayout from "./character-gear-layout"
import BaseGearSlot from "./wow/character-paperdoll-gearslot"

export default function WowAuditData({ data: wowAudit }: { data: CharacterWowAudit }) {
    // Create a mapping of slot keys to items
    const gearBySlot = wowAudit.itemsEquipped.reduce<
        Record<string, (typeof wowAudit.itemsEquipped)[number]>
    >((acc, gearItem) => {
        if (gearItem.equippedInSlot) {
            acc[gearItem.equippedInSlot] = gearItem
        }
        return acc
    }, {})

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
            tiersetInfo={wowAudit.tiersetInfo}
        />
    )
}

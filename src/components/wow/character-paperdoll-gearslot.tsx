"use client"

import type React from "react"
import type { GearItem } from "@/shared/models/item.models"
import { WowGearIcon } from "./wow-gear-icon"

export const createGearSlotMapping = (itemsEquipped: GearItem[]) => {
    return itemsEquipped.reduce<Record<string, GearItem>>((acc, gearItem) => {
        if (gearItem.equippedInSlot) {
            acc[gearItem.equippedInSlot] = gearItem
        }
        return acc
    }, {})
}

// Consistent icon size for all slots (square)
const ICON_SIZE = "h-12 w-12"
const ICON_STYLE = `rounded-md ${ICON_SIZE} border border-background/50 shadow-md`

type BaseGearSlotProps = {
    equippedItem?: GearItem
    className?: string
    showTierBanner?: boolean
    rightSide?: boolean
    showExtendedInfo: boolean
    flipExtendedInfo?: boolean
    children?: React.ReactNode
}

export default function BaseGearSlot({
    equippedItem,
    className = "",
    showTierBanner = false,
    showExtendedInfo,
    flipExtendedInfo = false,
    children,
}: BaseGearSlotProps) {
    return (
        <div className={`flex items-center h-12 ${className}`}>
            {equippedItem ? (
                <WowGearIcon
                    gearItem={equippedItem}
                    showTiersetLine={showTierBanner}
                    showExtendedInfo={showExtendedInfo}
                    flipExtendedInfo={flipExtendedInfo}
                    iconClassName={ICON_STYLE}
                />
            ) : (
                <div
                    className={`rounded-md ${ICON_SIZE} bg-black/40 ring-1 ring-white/10`}
                />
            )}
            {children}
        </div>
    )
}

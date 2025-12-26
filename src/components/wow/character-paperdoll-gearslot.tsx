"use client"

import type React from "react"

import type { GearItem } from "@/shared/types/types"

import { WowGearIcon } from "./wow-gear-icon"

export const createGearSlotMapping = (itemsEquipped: GearItem[]) => {
    return itemsEquipped.reduce<Record<string, GearItem>>((acc, gearItem) => {
        if (gearItem.equippedInSlot) {
            acc[gearItem.equippedInSlot] = gearItem
        }
        return acc
    }, {})
}

type BaseGearSlotProps = {
    equippedItem?: GearItem
    className?: string
    iconClassName?: string
    showTierBanner?: boolean
    rightSide?: boolean
    showExtendedInfo: boolean
    flipExtendedInfo?: boolean
    children?: React.ReactNode
}

export default function BaseGearSlot({
    equippedItem,
    className = "",
    iconClassName = "rounded-lg h-16 w-16 border-2 border-background shadow-lg",
    showTierBanner = false,
    showExtendedInfo,
    flipExtendedInfo = false,
    children,
}: BaseGearSlotProps) {
    return (
        <div className={`flex flex-col items-center gap-2 ${className}`}>
            <div className="relative">
                {equippedItem ? (
                    <WowGearIcon
                        gearItem={equippedItem}
                        showTiersetLine={showTierBanner}
                        showExtendedInfo={showExtendedInfo}
                        flipExtendedInfo={flipExtendedInfo}
                        iconClassName={iconClassName}
                    />
                ) : (
                    <div className="rounded-lg h-16 w-16 border-2 border-dashed border-muted bg-muted/20" />
                )}
            </div>
            {children}
        </div>
    )
}

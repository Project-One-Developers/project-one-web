"use client"

import Image from "next/image"
import type React from "react"
import { getEquippedSlotIcon } from "@/lib/wow-icon"
import type { GearItem } from "@/shared/models/item.models"
import type { WowItemEquippedSlotKey } from "@/shared/models/wow.models"
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
const ICON_STYLE = `rounded-md ${ICON_SIZE} border border-background/50 shadow-md overflow-hidden`

type BaseGearSlotProps = {
    slotKey: WowItemEquippedSlotKey
    equippedItem?: GearItem
    className?: string
    showTierBanner?: boolean
    rightSide?: boolean
    showExtendedInfo: boolean
    flipExtendedInfo?: boolean
    children?: React.ReactNode
}

export default function BaseGearSlot({
    slotKey,
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
                <div className={`relative ${ICON_STYLE} bg-black/40`}>
                    <Image
                        src={getEquippedSlotIcon(slotKey)}
                        alt={slotKey}
                        width={48}
                        height={48}
                        className="opacity-30 saturate-0"
                    />
                </div>
            )}
            {children}
        </div>
    )
}

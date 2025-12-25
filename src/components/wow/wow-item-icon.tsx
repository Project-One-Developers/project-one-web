"use client"

import type { GearItem } from "@/shared/types/types"
import { WowGearIcon } from "./wow-gear-icon"

type WowItemIconProps = {
    gearItem: GearItem
    size?: "sm" | "md" | "lg"
}

const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
}

export function WowItemIcon({ gearItem, size = "md" }: WowItemIconProps) {
    return (
        <WowGearIcon
            gearItem={gearItem}
            showItemTrackDiff={false}
            iconClassName={sizeClasses[size]}
        />
    )
}

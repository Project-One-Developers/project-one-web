"use client"

import { isInCurrentWowWeek } from "@/shared/libs/date/date-utils"
import type { Droptimizer } from "@/shared/types/types"
import { useMemo } from "react"
import { WowGearIcon } from "./wow/wow-gear-icon"

type CurrentGreatVaultPanelProps = {
    droptimizer: Droptimizer | null
}

export const CurrentGreatVaultPanel = ({ droptimizer }: CurrentGreatVaultPanelProps) => {
    const { weeklyChests, hasData } = useMemo(() => {
        const weeklyChests = droptimizer?.weeklyChest
        const isValidWeek =
            droptimizer && weeklyChests && isInCurrentWowWeek(droptimizer.simInfo.date)
        const hasData = isValidWeek && weeklyChests.length > 0
        return { weeklyChests, hasData }
    }, [droptimizer])

    return (
        <div className="flex flex-col p-6 bg-muted rounded-lg relative">
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                Current Great Vault
            </h4>
            <div className="flex flex-wrap gap-2">
                {hasData && weeklyChests ? (
                    weeklyChests.map((gear) => (
                        <WowGearIcon key={gear.item.id} gearItem={gear} />
                    ))
                ) : (
                    <div className="text-sm text-muted-foreground">
                        No great vault info for this week
                    </div>
                )}
            </div>
        </div>
    )
}

"use client"

import { useMemo } from "react"
import { isInCurrentWowWeek } from "@/shared/libs/date/date-utils"
import type { Droptimizer } from "@/shared/models/simulation.model"
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
        <div className="flex flex-col p-4 bg-card/40 backdrop-blur-sm border border-border/40 rounded-2xl">
            <h4 className="text-xs font-medium mb-3 text-muted-foreground uppercase tracking-wider">
                Current Great Vault
            </h4>
            <div className="flex flex-wrap gap-2">
                {hasData && weeklyChests ? (
                    weeklyChests.map((gear) => (
                        <WowGearIcon key={gear.item.id} gearItem={gear} />
                    ))
                ) : (
                    <div className="text-sm text-muted-foreground/60">
                        No great vault info for this week
                    </div>
                )}
            </div>
        </div>
    )
}

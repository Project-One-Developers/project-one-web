"use client"

import { useMemo } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { SectionHeader } from "@/components/ui/section-header"
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
        <GlassCard className="flex flex-col">
            <SectionHeader className="mb-3">Current Great Vault</SectionHeader>
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
        </GlassCard>
    )
}

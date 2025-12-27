"use client"

import type { JSX } from "react"

import { useRaidLootTable } from "@/lib/queries/bosses"
import { getDpsHumanReadable } from "@/lib/utils"
import type { BossWithItems, Droptimizer, DroptimizerUpgrade } from "@/shared/types/types"

import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { WowItemIcon } from "./wow/wow-item-icon"

type DroptimizerDetailDialogProps = {
    droptimizer: Droptimizer
}

export default function DroptimizerDetailDialog({
    droptimizer,
}: DroptimizerDetailDialogProps): JSX.Element {
    const { data: bosses = [] } = useRaidLootTable(droptimizer.raidInfo.id)

    // Group upgrades by boss
    const bossMap = new Map<BossWithItems, DroptimizerUpgrade[]>()

    droptimizer.upgrades.forEach((up) => {
        for (const boss of bosses) {
            const bossHasItem = boss.items.some((i) => i.id === up.item.id)
            if (bossHasItem) {
                const existing = bossMap.get(boss)
                if (existing) {
                    existing.push(up)
                } else {
                    bossMap.set(boss, [up])
                }
                break
            }
        }
    })

    // Sort bosses by order
    const sortedBosses = [...bossMap.keys()].sort((a, b) => a.order - b.order)

    return (
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle>Droptimizer Details</DialogTitle>
                <DialogDescription>
                    <a
                        href={droptimizer.url}
                        rel="noreferrer"
                        target="_blank"
                        className="text-blue-400 hover:underline"
                    >
                        {droptimizer.charInfo.name} - {droptimizer.raidInfo.difficulty}
                    </a>
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4 max-h-[60vh] overflow-y-auto">
                {sortedBosses.map((boss) => (
                    <div key={boss.id} className="flex flex-col gap-2">
                        {/* Boss Name */}
                        <div className="font-bold text-sm text-muted-foreground">
                            {boss.order} • {boss.name}
                        </div>
                        {/* Upgrades */}
                        <div className="flex flex-wrap gap-3">
                            {bossMap
                                .get(boss)
                                ?.sort((a, b) => b.dps - a.dps)
                                .map((upgrade) => {
                                    const foundItem = boss.items.find(
                                        (i) => i.id === upgrade.item.id
                                    )
                                    return (
                                        <div
                                            key={upgrade.item.id}
                                            className="flex flex-col items-center"
                                        >
                                            {foundItem ? (
                                                <WowItemIcon
                                                    item={foundItem}
                                                    iconOnly={true}
                                                    ilvl={upgrade.ilvl}
                                                    iconClassName="object-cover object-top rounded-full h-8 w-8 border border-background"
                                                />
                                            ) : (
                                                <WowItemIcon
                                                    item={upgrade.item.id}
                                                    iconOnly={true}
                                                    ilvl={upgrade.ilvl}
                                                    iconClassName="object-cover object-top rounded-full h-8 w-8 border border-background"
                                                />
                                            )}
                                            <p className="text-xs text-center mt-1">
                                                {getDpsHumanReadable(upgrade.dps)}
                                            </p>
                                        </div>
                                    )
                                })}
                        </div>
                    </div>
                ))}
            </div>
            {sortedBosses.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">
                    No upgrades found
                </p>
            )}
        </DialogContent>
    )
}

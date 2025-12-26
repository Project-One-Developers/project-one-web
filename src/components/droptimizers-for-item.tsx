"use client"

import { getDpsHumanReadable } from "@/lib/utils"
import { formatUnixTimestampToRelativeDays } from "@/shared/libs/date/date-utils"
import type { Droptimizer, Item } from "@/shared/types/types"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { WowSpecIcon } from "./wow/wow-spec-icon"

type DroptimizersForItemProps = {
    item: Item
    droptimizers: Droptimizer[]
}

export const DroptimizersForItem = ({ item, droptimizers }: DroptimizersForItemProps) => {
    const itemDroptimizerUpgrades = droptimizers
        .flatMap((dropt) =>
            dropt.upgrades.map((upgrade) => ({
                ...upgrade,
                droptimizer: {
                    url: dropt.url,
                    charInfo: dropt.charInfo,
                    simInfo: dropt.simInfo,
                },
            }))
        )
        .filter((upgrade) => upgrade.item.id === item.id)
        .sort((a, b) => b.dps - a.dps)

    if (itemDroptimizerUpgrades.length === 0) {
        return null
    }

    return (
        <div className="flex flex-row items-center gap-x-2">
            {itemDroptimizerUpgrades.map((upgrade) => (
                <div key={`${upgrade.id}-${upgrade.droptimizer.charInfo.name}`}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex flex-col items-center">
                                <WowSpecIcon
                                    specId={upgrade.droptimizer.charInfo.specId}
                                    className="object-cover object-top rounded-md full h-5 w-5 border border-background"
                                />
                                <p className="text-bold text-[11px] text-green-400">
                                    {getDpsHumanReadable(upgrade.dps)}
                                </p>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={5}>
                            {`${
                                upgrade.droptimizer.charInfo.name
                            } - ${formatUnixTimestampToRelativeDays(
                                upgrade.droptimizer.simInfo.date
                            )}`}
                        </TooltipContent>
                    </Tooltip>
                </div>
            ))}
        </div>
    )
}

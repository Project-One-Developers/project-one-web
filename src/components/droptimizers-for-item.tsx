"use client"

import { getDpsHumanReadable } from "@/lib/utils"
import { formatUnixTimestampToRelativeDays } from "@/shared/libs/date/date-utils"
import type { Character } from "@/shared/models/character.model"
import type { Item } from "@/shared/models/item.model"
import type { Droptimizer } from "@/shared/models/simulation.model"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { WowSpecIcon } from "./wow/wow-spec-icon"

type DroptimizersForItemProps = {
    item: Item
    droptimizers: Droptimizer[]
    characters: Character[]
}

export const DroptimizersForItem = ({
    item,
    droptimizers,
    characters,
}: DroptimizersForItemProps) => {
    const charById = new Map(characters.map((c) => [c.id, c]))

    const itemDroptimizerUpgrades = droptimizers
        .flatMap((dropt) =>
            dropt.upgrades.map((upgrade) => ({
                ...upgrade,
                droptimizer: {
                    url: dropt.url,
                    characterId: dropt.characterId,
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
            {itemDroptimizerUpgrades.map((upgrade) => {
                const charName =
                    charById.get(upgrade.droptimizer.characterId)?.name ?? "Unknown"
                return (
                    <div key={`${upgrade.id}-${upgrade.droptimizer.characterId}`}>
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
                                {`${charName} - ${formatUnixTimestampToRelativeDays(
                                    upgrade.droptimizer.simInfo.date
                                )}`}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                )
            })}
        </div>
    )
}

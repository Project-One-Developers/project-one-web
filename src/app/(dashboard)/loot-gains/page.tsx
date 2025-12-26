"use client"

import { LoaderCircle } from "lucide-react"

import Image from "next/image"
import { useMemo, type JSX } from "react"

import { DroptimizersForItem } from "@/components/droptimizers-for-item"
import { GlobalFilterUI } from "@/components/global-filter-ui"
import { WowItemIcon } from "@/components/wow/wow-item-icon"
import { FilterProvider, useFilterContext } from "@/lib/filter-context"
import { filterDroptimizer } from "@/lib/filters"
import { useRaidLootTable } from "@/lib/queries/bosses"
import { useLatestDroptimizers } from "@/lib/queries/droptimizers"
import { useCharacters } from "@/lib/queries/players"
import { encounterIcon } from "@/lib/wow-icon"
import type {
    BossWithItems,
    Droptimizer,
    Item,
    WowRaidDifficulty,
} from "@/shared/types/types"

// Boss Panel Component
type BossPanelProps = {
    boss: BossWithItems
    droptimizers: Droptimizer[]
    diff: WowRaidDifficulty
    hideItemsWithoutDropt: boolean
}

const BossPanel = ({
    boss,
    droptimizers,
    diff,
    hideItemsWithoutDropt,
}: BossPanelProps) => {
    const itemHasDroptimizers = (item: Item): boolean => {
        if (hideItemsWithoutDropt) {
            return droptimizers.some((dropt) =>
                dropt.upgrades.some((upgrade) => upgrade.item.id === item.id)
            )
        }
        return true
    }

    const filteredItems = boss.items.filter(itemHasDroptimizers)
    const bossImage = encounterIcon.get(boss.id)

    // Don't render empty boss panels when hiding items without droptimizers
    if (hideItemsWithoutDropt && filteredItems.length === 0) {
        return null
    }

    return (
        <div className="flex flex-col bg-muted rounded-lg overflow-hidden min-w-[300px]">
            {/* Boss header: cover + name */}
            <div className="flex flex-col gap-y-2">
                {bossImage && (
                    <Image
                        src={bossImage}
                        alt={`${boss.name} icon`}
                        width={300}
                        height={128}
                        className="w-full h-32 object-scale-down"
                        unoptimized
                    />
                )}
                <h2 className="text-center text-xs font-bold">{boss.name}</h2>
            </div>
            {/* Boss items */}
            <div className="flex flex-col gap-y-3 p-6">
                {filteredItems.length > 0 ? (
                    filteredItems
                        .sort((a, b) => a.id - b.id)
                        .map((item) => (
                            <div
                                key={item.id}
                                className="flex flex-row gap-x-8 justify-between items-center p-1 hover:bg-gray-700 transition-colors duration-200 rounded-md"
                            >
                                <WowItemIcon
                                    item={item}
                                    iconOnly={false}
                                    raidDiff={diff}
                                    tierBanner={true}
                                    showRoleIcons={true}
                                />
                                <div className="flex flex-row items-center gap-x-2">
                                    <DroptimizersForItem
                                        item={item}
                                        droptimizers={droptimizers}
                                    />
                                </div>
                            </div>
                        ))
                ) : (
                    <p className="text-center text-sm text-gray-500">
                        No upgrades available
                    </p>
                )}
            </div>
        </div>
    )
}

// Main Content Component (needs filter context)
function LootGainsContent(): JSX.Element {
    const { filter } = useFilterContext()

    const droptimizersRes = useLatestDroptimizers()
    const raidLootTableRes = useRaidLootTable()
    const charRes = useCharacters()

    const filteredDroptimizers = useMemo(() => {
        if (!droptimizersRes.data) {
            return []
        }
        return filterDroptimizer(droptimizersRes.data, charRes.data ?? [], filter)
    }, [droptimizersRes.data, charRes.data, filter])

    if (raidLootTableRes.isLoading || droptimizersRes.isLoading || charRes.isLoading) {
        return (
            <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                <LoaderCircle className="animate-spin text-5xl" />
            </div>
        )
    }

    const encounterList = raidLootTableRes.data ?? []

    return (
        <div className="w-full min-h-screen overflow-y-auto flex flex-col gap-y-8 items-center p-8 relative">
            {/* Boss List */}
            <div className="flex flex-wrap gap-x-4 gap-y-4 justify-center">
                {encounterList
                    .sort((a, b) => a.order - b.order)
                    .map((boss) => (
                        <BossPanel
                            key={boss.id}
                            boss={boss}
                            droptimizers={filteredDroptimizers}
                            diff={filter.selectedRaidDiff}
                            hideItemsWithoutDropt={filter.hideIfNoUpgrade}
                        />
                    ))}
            </div>

            {encounterList.length === 0 && (
                <div className="bg-muted p-8 rounded-lg text-center">
                    <p className="text-muted-foreground">
                        No raid loot table data available.
                    </p>
                </div>
            )}

            {/* Bottom Right Filter button */}
            <GlobalFilterUI
                showRaidDifficulty={true}
                showDroptimizerFilters={true}
                showMainsAlts={true}
                showClassFilter={true}
                showSlotFilter={true}
                showArmorTypeFilter={true}
            />
        </div>
    )
}

// Main Component with FilterProvider
export default function LootGainsPage(): JSX.Element {
    return (
        <FilterProvider>
            <LootGainsContent />
        </FilterProvider>
    )
}

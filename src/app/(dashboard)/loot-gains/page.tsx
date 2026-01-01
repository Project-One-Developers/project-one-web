"use client"

import { Package } from "lucide-react"
import { useMemo, type JSX } from "react"
import { DroptimizersForItem } from "@/components/droptimizers-for-item"
import { FilterBar } from "@/components/filter-bar"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { BossCard } from "@/components/wow/boss-card"
import { WowItemIcon } from "@/components/wow/wow-item-icon"
import { useFilterContext } from "@/lib/filter-context"
import { filterDroptimizer, type LootFilter } from "@/lib/filters"
import { useRaidLootTable } from "@/lib/queries/bosses"
import { useLatestDroptimizers } from "@/lib/queries/droptimizers"
import { useCharacters } from "@/lib/queries/players"
import type { BossWithItems } from "@/shared/models/boss.models"
import type { Character } from "@/shared/models/character.models"
import type { Item } from "@/shared/models/item.models"
import type { Droptimizer } from "@/shared/models/simulation.models"
import type { WowRaidDifficulty } from "@/shared/models/wow.models"

// Boss Panel Component
type BossPanelProps = {
    boss: BossWithItems
    droptimizers: Droptimizer[]
    characters: Character[]
    diff: WowRaidDifficulty
    filter: LootFilter
}

const BossPanel = ({ boss, droptimizers, characters, diff, filter }: BossPanelProps) => {
    const itemPassesFilter = (item: Item): boolean => {
        // Filter by droptimizers if hideIfNoUpgrade is set
        if (filter.hideIfNoUpgrade) {
            const hasDroptimizer = droptimizers.some((dropt) =>
                dropt.upgrades.some((upgrade) => upgrade.item.id === item.id)
            )
            if (!hasDroptimizer) {
                return false
            }
        }

        // Filter by class - only show items that have upgrades for selected classes
        if (filter.selectedWowClassName.length > 0) {
            const hasUpgradeForClass = droptimizers.some((dropt) =>
                dropt.upgrades.some((upgrade) => upgrade.item.id === item.id)
            )
            if (!hasUpgradeForClass) {
                return false
            }
        }

        // Filter by slot
        if (filter.selectedSlots.length > 0) {
            if (!filter.selectedSlots.includes(item.slotKey)) {
                return false
            }
        }

        // Filter by armor type
        if (filter.selectedArmorTypes.length > 0) {
            if (!item.armorType || !filter.selectedArmorTypes.includes(item.armorType)) {
                return false
            }
        }

        return true
    }

    const filteredItems = boss.items.filter(itemPassesFilter)

    return (
        <BossCard bossId={boss.id} bossName={boss.name}>
            {filteredItems.length > 0 ? (
                filteredItems
                    .sort((a, b) => a.id - b.id)
                    .map((item) => (
                        <div
                            key={item.id}
                            className="flex flex-row gap-x-8 justify-between items-center p-2 hover:bg-card/60 transition-all duration-200 rounded-xl border border-transparent hover:border-primary/20"
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
                                    characters={characters}
                                />
                            </div>
                        </div>
                    ))
            ) : (
                <p className="text-center text-sm text-muted-foreground py-2">
                    No items match filters
                </p>
            )}
        </BossCard>
    )
}

// Main Content Component
export default function LootGainsPage(): JSX.Element {
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

    const isLoading =
        raidLootTableRes.isLoading || droptimizersRes.isLoading || charRes.isLoading

    const encounterList = raidLootTableRes.data ?? []

    return (
        <div className="w-full min-h-screen overflow-y-auto flex flex-col gap-y-6 p-8">
            {/* Filter Bar */}
            <FilterBar
                showRaidDifficulty={true}
                showDroptimizerFilters={true}
                showMainsAlts={true}
                showUpgradesToggle={true}
                showClassFilter={true}
                showSlotFilter={true}
                showArmorTypeFilter={true}
            />

            {/* Loading State */}
            {isLoading && (
                <LoadingSpinner size="lg" iconSize="lg" text="Loading loot gains..." />
            )}

            {/* Boss List */}
            {!isLoading && encounterList.length > 0 && (
                <div className="flex flex-wrap gap-4 justify-center">
                    {encounterList
                        .sort((a, b) => a.order - b.order)
                        .map((boss) => (
                            <BossPanel
                                key={boss.id}
                                boss={boss}
                                droptimizers={filteredDroptimizers}
                                characters={charRes.data ?? []}
                                diff={filter.selectedRaidDiff}
                                filter={filter}
                            />
                        ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && encounterList.length === 0 && (
                <EmptyState
                    icon={<Package className="w-8 h-8" />}
                    title="No loot data"
                    description="No raid loot table data available"
                />
            )}
        </div>
    )
}

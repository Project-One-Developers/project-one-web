"use client"

import { Edit, Package, Search } from "lucide-react"
import { useState, useMemo, useEffect, type JSX } from "react"
import { FilterBar } from "@/components/filter-bar"
import ItemManagementDialog from "@/components/item-management-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { GlassCard } from "@/components/ui/glass-card"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { BossCard } from "@/components/wow/boss-card"
import { WowItemIcon } from "@/components/wow/wow-item-icon"
import { WowSpecIcon } from "@/components/wow/wow-spec-icon"
import { useFilterContext } from "@/lib/filter-context"
import type { LootFilter } from "@/lib/filters"
import { useBisList } from "@/lib/queries/bis-list"
import { useRaidLootTable } from "@/lib/queries/bosses"
import { useItemNotes } from "@/lib/queries/items"
import { cn, defined } from "@/lib/utils"
import { getWowClassBySpecId } from "@/shared/libs/spec-parser/spec-utils"
import type { BisList } from "@/shared/models/bis-list.models"
import type { BossWithItems } from "@/shared/models/boss.models"
import type { ItemNote } from "@/shared/models/item-note.models"
import type { Item } from "@/shared/models/item.models"

// Boss Panel Component
type BossPanelProps = {
    boss: BossWithItems
    bisLists: BisList[]
    itemNotes: ItemNote[]
    onEdit: (item: Item, note: string) => void
    filter: LootFilter
}

const BossPanel = ({ boss, bisLists, itemNotes, onEdit, filter }: BossPanelProps) => {
    // Filter items based on the selected classes, slots, and armor types
    const filteredItems = useMemo(() => {
        return boss.items.filter((item) => {
            const bisForItem = bisLists.filter((bis) => bis.itemId === item.id)
            const allSpecIds = bisForItem.flatMap((bis) => bis.specIds)

            // If no filter is selected, show all items
            if (
                filter.selectedWowClassName.length === 0 &&
                filter.selectedSlots.length === 0 &&
                filter.selectedArmorTypes.length === 0
            ) {
                return true
            }

            let passesClassFilter = true
            let passesSlotFilter = true
            let passesArmorTypeFilter = true

            // Class filter - check if any BIS specs match selected classes
            if (filter.selectedWowClassName.length > 0) {
                const itemClasses = allSpecIds
                    .map((specId) => {
                        try {
                            return getWowClassBySpecId(specId).name
                        } catch {
                            return null
                        }
                    })
                    .filter(defined)

                passesClassFilter = itemClasses.some((className) =>
                    filter.selectedWowClassName.includes(className)
                )
            }

            // Slot filter
            if (filter.selectedSlots.length > 0) {
                passesSlotFilter = filter.selectedSlots.includes(item.slotKey)
            }

            // Armor type filter
            if (filter.selectedArmorTypes.length > 0) {
                passesArmorTypeFilter = item.armorType
                    ? filter.selectedArmorTypes.includes(item.armorType)
                    : false
            }

            return passesClassFilter && passesSlotFilter && passesArmorTypeFilter
        })
    }, [boss.items, bisLists, filter])

    return (
        <BossCard bossId={boss.id} bossName={boss.name} className="min-w-[350px]">
            {filteredItems.length > 0 ? (
                filteredItems
                    .sort((a, b) => {
                        const aHasBis = bisLists.some((bis) => bis.itemId === a.id)
                        const bHasBis = bisLists.some((bis) => bis.itemId === b.id)
                        if (aHasBis && !bHasBis) {
                            return -1
                        }
                        if (!aHasBis && bHasBis) {
                            return 1
                        }
                        return a.id - b.id
                    })
                    .map((item) => {
                        const bisForItem = bisLists.filter(
                            (bis) => bis.itemId === item.id
                        )
                        const allSpecIds = bisForItem.flatMap((bis) => bis.specIds)
                        const itemNote =
                            itemNotes.find((note) => note.itemId === item.id)?.note || ""

                        return (
                            <div
                                key={item.id}
                                className={cn(
                                    "flex flex-row gap-x-8 justify-between items-center p-2 hover:bg-card/60 transition-all duration-200 rounded-xl cursor-pointer relative group border border-transparent hover:border-primary/20",
                                    !allSpecIds.length && "opacity-30"
                                )}
                                onClick={(e) => {
                                    e.preventDefault()
                                    onEdit(item, itemNote)
                                }}
                            >
                                <WowItemIcon
                                    item={item}
                                    iconOnly={false}
                                    raidDiff="Mythic"
                                    tierBanner={true}
                                    showIlvl={false}
                                    showRoleIcons={true}
                                />

                                <div className="flex flex-col items-center">
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        {allSpecIds.length ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span>
                                                        {allSpecIds.length} spec
                                                        {allSpecIds.length > 1 && "s"}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div className="flex flex-col gap-y-1">
                                                        {allSpecIds.map((s) => (
                                                            <WowSpecIcon
                                                                key={s}
                                                                specId={s}
                                                                className="object-cover object-top rounded-md full h-5 w-5 border border-background"
                                                            />
                                                        ))}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : null}

                                        {/* Note indicator */}
                                        {itemNote && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="text-primary">
                                                        <Edit size={12} />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs">
                                                    {itemNote}
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>

                                <button className="absolute -bottom-1 -right-1 hidden group-hover:flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground rounded-full shadow-md">
                                    <Edit size={12} />
                                </button>
                            </div>
                        )
                    })
            ) : (
                <p className="text-center text-sm text-muted-foreground py-2">
                    No items match filters
                </p>
            )}
        </BossCard>
    )
}

// Main Content Component
type ItemWithBisSpecs = {
    item: Item
    specs: number[]
    note: string
}

export default function LootTablePage(): JSX.Element {
    const { filter } = useFilterContext()

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
    const [selectedItem, setSelectedItem] = useState<ItemWithBisSpecs | null>(null)

    const bossesWithItemRes = useRaidLootTable()
    const bisRes = useBisList()
    const itemNotesRes = useItemNotes()

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery.trim())
        }, 300)

        return () => {
            clearTimeout(handler)
        }
    }, [searchQuery])

    // Memoized filtering logic with search query
    const filteredBosses: BossWithItems[] = useMemo(() => {
        if (!bossesWithItemRes.data) {
            return []
        }

        return bossesWithItemRes.data.map((boss) => ({
            ...boss,
            items: boss.items.filter((item) => {
                // Apply search filter first
                if (
                    debouncedSearchQuery &&
                    !item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
                ) {
                    return false
                }
                return true
            }),
        }))
    }, [bossesWithItemRes.data, debouncedSearchQuery])

    const isLoading =
        bossesWithItemRes.isLoading || bisRes.isLoading || itemNotesRes.isLoading

    const bisLists = bisRes.data ?? []
    const itemNotes = itemNotesRes.data ?? []

    const handleEditClick = (item: Item, note: string) => {
        const selectedBis = bisLists.find((b) => b.itemId === item.id)
        setSelectedItem({ item: item, specs: selectedBis?.specIds ?? [], note })
        setIsEditDialogOpen(true)
    }

    return (
        <div className="w-full min-h-screen overflow-y-auto flex flex-col gap-y-6 p-8">
            {/* Filter Bar with Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <FilterBar
                    showRaidDifficulty={false}
                    showDroptimizerFilters={false}
                    showMainsAlts={false}
                    showClassFilter={true}
                    showSlotFilter={true}
                    showArmorTypeFilter={true}
                    className="flex-1"
                />
                <GlassCard
                    variant="solid"
                    padding="sm"
                    className="backdrop-blur-none bg-card/80 w-full sm:w-64"
                >
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search items..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                            }}
                            className="w-full pl-10 bg-transparent border-0 focus-visible:ring-0"
                        />
                    </div>
                </GlassCard>
            </div>

            {/* Loading State */}
            {isLoading && (
                <LoadingSpinner size="lg" iconSize="lg" text="Loading loot table..." />
            )}

            {/* Boss List */}
            {!isLoading && filteredBosses.length > 0 && (
                <div className="flex flex-wrap gap-4 justify-center">
                    {filteredBosses
                        .sort((a, b) => a.order - b.order)
                        .map((boss) => (
                            <BossPanel
                                key={boss.id}
                                boss={boss}
                                bisLists={bisLists}
                                itemNotes={itemNotes}
                                onEdit={handleEditClick}
                                filter={filter}
                            />
                        ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredBosses.length === 0 && (
                <EmptyState
                    icon={<Package className="w-8 h-8" />}
                    title="No items found"
                    description="No items match your current filters"
                />
            )}

            {selectedItem && (
                <ItemManagementDialog
                    isOpen={isEditDialogOpen}
                    setOpen={setIsEditDialogOpen}
                    itemAndSpecs={selectedItem}
                />
            )}
        </div>
    )
}

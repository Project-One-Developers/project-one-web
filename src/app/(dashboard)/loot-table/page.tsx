"use client"

import Image from "next/image"
import { useState, useMemo, useEffect, type JSX } from "react"
import { LoaderCircle, Edit, Search } from "lucide-react"
import { cn, defined } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { GlobalFilterUI } from "@/components/global-filter-ui"
import { FilterProvider, useFilterContext } from "@/lib/filter-context"
import ItemManagementDialog from "@/components/item-management-dialog"
import { WowItemIcon } from "@/components/wow/wow-item-icon"
import { WowSpecIcon } from "@/components/wow/wow-spec-icon"
import { useRaidLootTable } from "@/lib/queries/bosses"
import { useBisList } from "@/lib/queries/bis-list"
import { useItemNotes } from "@/lib/queries/items"
import { encounterIcon } from "@/lib/wow-icon"
import { getWowClassBySpecId } from "@/shared/libs/spec-parser/spec-utils"
import type { BisList, BossWithItems, Item, ItemNote } from "@/shared/types/types"
import type { LootFilter } from "@/lib/filters"

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

    const bossImage = encounterIcon.get(boss.id)

    return (
        <div className="flex flex-col bg-muted rounded-lg overflow-hidden min-w-[350px]">
            {/* Boss header: cover + name */}
            <div className="flex flex-col gap-y-2">
                {bossImage && (
                    <Image
                        src={bossImage}
                        alt={`${boss.name} icon`}
                        width={350}
                        height={128}
                        className="w-full h-32 object-scale-down"
                        unoptimized
                    />
                )}
                <h2 className="text-center text-xs font-bold">{boss.name}</h2>
            </div>
            {/* Boss items */}
            <div className="flex flex-col gap-y-3 p-6">
                {filteredItems
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
                                    "flex flex-row gap-x-8 justify-between items-center p-1 hover:bg-gray-700 transition-colors duration-200 rounded-md cursor-pointer relative group",
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
                                    <div className="text-xs text-gray-400 flex items-center gap-1">
                                        {allSpecIds.length ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span>
                                                        {allSpecIds.length} spec
                                                        {allSpecIds.length > 1 && "s"}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent
                                                    className="TooltipContent"
                                                    sideOffset={5}
                                                >
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
                                                    <div className="text-blue-400">
                                                        <Edit size={12} />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent
                                                    className="TooltipContent max-w-xs"
                                                    sideOffset={5}
                                                >
                                                    <div className="text-xs">
                                                        {itemNote}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>

                                <button className="absolute -bottom-2 -right-2 hidden group-hover:flex items-center justify-center w-5 h-5 bg-red-500 text-white rounded-full">
                                    <Edit size={14} />
                                </button>
                            </div>
                        )
                    })}
            </div>
        </div>
    )
}

// Main Content Component (needs filter context)
type ItemWithBisSpecs = {
    item: Item
    specs: number[]
    note: string
}

function LootTableContent(): JSX.Element {
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

        return bossesWithItemRes.data
            .map((boss) => ({
                ...boss,
                items: boss.items.filter((item) => {
                    // Apply search filter first
                    if (
                        debouncedSearchQuery &&
                        !item.name
                            .toLowerCase()
                            .includes(debouncedSearchQuery.toLowerCase())
                    ) {
                        return false
                    }
                    return true
                }),
            }))
            .filter((boss) => boss.items.length > 0) // Remove bosses with no matching items
    }, [bossesWithItemRes.data, debouncedSearchQuery])

    if (bossesWithItemRes.isLoading || bisRes.isLoading || itemNotesRes.isLoading) {
        return (
            <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                <LoaderCircle className="animate-spin text-5xl" />
            </div>
        )
    }

    const bisLists = bisRes.data ?? []
    const itemNotes = itemNotesRes.data ?? []

    const handleEditClick = (item: Item, note: string) => {
        const selectedBis = bisLists.find((b) => b.itemId === item.id)
        setSelectedItem({ item: item, specs: selectedBis?.specIds ?? [], note })
        setIsEditDialogOpen(true)
    }

    return (
        <div className="w-full min-h-screen overflow-y-auto flex flex-col gap-y-8 items-center p-8 relative">
            {/* Search Bar */}
            <div className="w-full max-w-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                        }}
                        className="w-full pl-10"
                    />
                </div>
            </div>

            {/* Boss List */}
            <div className="flex flex-wrap gap-x-4 gap-y-4 justify-center">
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

            {filteredBosses.length === 0 && (
                <div className="bg-muted p-8 rounded-lg text-center">
                    <p className="text-muted-foreground">
                        No items found matching your filters.
                    </p>
                </div>
            )}

            {/* Bottom Right Filter button */}
            <GlobalFilterUI
                showRaidDifficulty={false}
                showDroptimizerFilters={false}
                showMainsAlts={false}
                showClassFilter={true}
                showSlotFilter={true}
                showArmorTypeFilter={true}
            />

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

// Main Component with FilterProvider
export default function LootTablePage(): JSX.Element {
    return (
        <FilterProvider>
            <LootTableContent />
        </FilterProvider>
    )
}

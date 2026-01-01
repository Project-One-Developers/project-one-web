"use client"

import { Plus, RotateCcw, Star, TrendingUp, Users, X } from "lucide-react"
import Image from "next/image"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { GlassCard } from "@/components/ui/glass-card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SectionHeader } from "@/components/ui/section-header"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useFilterContext } from "@/lib/filter-context"
import { cn } from "@/lib/utils"
import { armorTypesIcon, classIcon, itemSlotIcon } from "@/lib/wow-icon"
import { formatWowSlotKey } from "@/shared/libs/items/item-slot-utils"
import { s } from "@/shared/libs/string-utils"
import {
    wowArmorTypeSchema,
    wowClassNameSchema,
    wowItemSlotKeySchema,
    type WowArmorType,
    type WowClassName,
    type WowItemSlotKey,
    type WowRaidDifficulty,
} from "@/shared/models/wow.models"

// Difficulty color mapping
const DIFFICULTY_COLORS: Record<WowRaidDifficulty, string> = {
    LFR: "text-gray-400 data-[state=on]:bg-gray-500/20 data-[state=on]:border-gray-500/40",
    Normal: "text-green-400 data-[state=on]:bg-green-500/20 data-[state=on]:border-green-500/40",
    Heroic: "text-orange-400 data-[state=on]:bg-orange-500/20 data-[state=on]:border-orange-500/40",
    Mythic: "text-purple-400 data-[state=on]:bg-purple-500/20 data-[state=on]:border-purple-500/40",
}

type FilterBarProps = {
    showRaidDifficulty?: boolean
    showDroptimizerFilters?: boolean
    showMainsAlts?: boolean
    showUpgradesToggle?: boolean
    showClassFilter?: boolean
    showSlotFilter?: boolean
    showArmorTypeFilter?: boolean
    className?: string
}

// Filter chip component for active filters
type FilterChipProps = {
    label: string
    icon?: string
    onRemove: () => void
}

const FilterChip = ({ label, icon, onRemove }: FilterChipProps) => (
    <button
        onClick={onRemove}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary hover:bg-primary/20 hover:border-primary/30 transition-all"
    >
        {icon && (
            <Image
                src={icon}
                alt={label}
                width={16}
                height={16}
                className="w-4 h-4 rounded-sm"
                unoptimized
            />
        )}
        <span className="max-w-25 truncate">{label}</span>
        <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
    </button>
)

// Toggle chip for Mains/Alts
type ToggleChipProps = {
    label: string
    icon?: ReactNode
    active: boolean
    onClick: () => void
    activeClassName?: string
}

const ToggleChip = ({
    label,
    icon,
    active,
    onClick,
    activeClassName,
}: ToggleChipProps) => (
    <button
        onClick={onClick}
        className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
            active
                ? cn("border-primary/30", activeClassName ?? "bg-primary/15 text-primary")
                : "bg-card/50 border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
        )}
    >
        {icon}
        <span>{label}</span>
    </button>
)

export const FilterBar = ({
    showRaidDifficulty = true,
    showDroptimizerFilters = true,
    showMainsAlts = true,
    showUpgradesToggle = false,
    showClassFilter = true,
    showSlotFilter = true,
    showArmorTypeFilter = true,
    className,
}: FilterBarProps) => {
    const { filter, updateFilter, resetFilter } = useFilterContext()

    const difficulties: WowRaidDifficulty[] = ["Normal", "Heroic", "Mythic"]

    // Toggle handlers
    const toggleClass = (className: WowClassName) => {
        const newClasses = filter.selectedWowClassName.includes(className)
            ? filter.selectedWowClassName.filter((c) => c !== className)
            : [...filter.selectedWowClassName, className]
        updateFilter("selectedWowClassName", newClasses)
    }

    const toggleSlot = (slot: WowItemSlotKey) => {
        const newSlots = filter.selectedSlots.includes(slot)
            ? filter.selectedSlots.filter((s) => s !== slot)
            : [...filter.selectedSlots, slot]
        updateFilter("selectedSlots", newSlots)
    }

    const toggleArmorType = (type: WowArmorType) => {
        const newTypes = filter.selectedArmorTypes.includes(type)
            ? filter.selectedArmorTypes.filter((t) => t !== type)
            : [...filter.selectedArmorTypes, type]
        updateFilter("selectedArmorTypes", newTypes)
    }

    // Count active filters (only count filters that are shown on this page)
    const activeFilterCount =
        (showClassFilter ? filter.selectedWowClassName.length : 0) +
        (showSlotFilter ? filter.selectedSlots.length : 0) +
        (showArmorTypeFilter ? filter.selectedArmorTypes.length : 0) +
        (showDroptimizerFilters && filter.onlyUpgrades ? 1 : 0)

    const hasAnyFilters = activeFilterCount > 0

    // Check if we should show the "Add Filters" button
    const showAddFilters =
        showClassFilter || showSlotFilter || showArmorTypeFilter || showDroptimizerFilters

    return (
        <GlassCard
            variant="solid"
            padding="sm"
            className={cn("backdrop-blur-none bg-card/80", className)}
        >
            <div className="flex flex-wrap items-center gap-3">
                {/* Difficulty Selector */}
                {showRaidDifficulty && (
                    <ToggleGroup
                        type="single"
                        value={filter.selectedRaidDiff}
                        onValueChange={(value) => {
                            const diff = difficulties.find((d) => d === value)
                            if (diff) {
                                updateFilter("selectedRaidDiff", diff)
                            }
                        }}
                        className="bg-card/50 border border-border/50 rounded-lg p-0.5"
                    >
                        {difficulties.map((diff) => (
                            <ToggleGroupItem
                                key={diff}
                                value={diff}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-md border border-transparent transition-all",
                                    "data-[state=off]:text-muted-foreground data-[state=off]:hover:text-foreground",
                                    DIFFICULTY_COLORS[diff]
                                )}
                            >
                                {diff}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                )}

                {/* Separator */}
                {showRaidDifficulty && showMainsAlts && (
                    <div className="w-px h-6 bg-border/50" />
                )}

                {/* Mains/Alts Toggles */}
                {showMainsAlts && (
                    <div className="flex items-center gap-2">
                        <ToggleChip
                            label="Mains"
                            icon={
                                <Star
                                    className={cn(
                                        "w-4 h-4",
                                        filter.showMains
                                            ? "text-amber-400"
                                            : "text-muted-foreground"
                                    )}
                                />
                            }
                            active={filter.showMains}
                            activeClassName="bg-amber-500/15 text-amber-400"
                            onClick={() => {
                                // Prevent deselecting if it's the only one selected
                                if (filter.showMains && !filter.showAlts) {
                                    return
                                }
                                updateFilter("showMains", !filter.showMains)
                            }}
                        />
                        <ToggleChip
                            label="Alts"
                            icon={
                                <Users
                                    className={cn(
                                        "w-4 h-4",
                                        filter.showAlts
                                            ? "text-blue-400"
                                            : "text-muted-foreground"
                                    )}
                                />
                            }
                            active={filter.showAlts}
                            activeClassName="bg-blue-500/15 text-blue-400"
                            onClick={() => {
                                // Prevent deselecting if it's the only one selected
                                if (filter.showAlts && !filter.showMains) {
                                    return
                                }
                                updateFilter("showAlts", !filter.showAlts)
                            }}
                        />
                    </div>
                )}

                {/* Separator */}
                {(showRaidDifficulty || showMainsAlts) && showUpgradesToggle && (
                    <div className="w-px h-6 bg-border/50" />
                )}

                {/* Upgrades Only Toggle */}
                {showUpgradesToggle && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div>
                                <ToggleChip
                                    label="Upgrades"
                                    icon={
                                        <TrendingUp
                                            className={cn(
                                                "w-4 h-4",
                                                filter.hideIfNoUpgrade
                                                    ? "text-emerald-400"
                                                    : "text-muted-foreground"
                                            )}
                                        />
                                    }
                                    active={filter.hideIfNoUpgrade}
                                    activeClassName="bg-emerald-500/15 text-emerald-400"
                                    onClick={() => {
                                        updateFilter(
                                            "hideIfNoUpgrade",
                                            !filter.hideIfNoUpgrade
                                        )
                                    }}
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Only show items with droptimizer upgrades</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* Separator */}
                {(showRaidDifficulty || showMainsAlts || showUpgradesToggle) &&
                    showAddFilters && <div className="w-px h-6 bg-border/50" />}

                {/* Add Filters Button */}
                {showAddFilters && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <Plus className="w-4 h-4" />
                                <span>Filters</span>
                                {hasAnyFilters && (
                                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="start">
                            <div className="space-y-4">
                                {/* Class Filter */}
                                {showClassFilter && (
                                    <div className="space-y-2">
                                        <SectionHeader>Class</SectionHeader>
                                        <div className="flex flex-wrap gap-1.5">
                                            {wowClassNameSchema.options.map(
                                                (wowClassName) => (
                                                    <button
                                                        key={wowClassName}
                                                        onClick={() => {
                                                            toggleClass(wowClassName)
                                                        }}
                                                        className={cn(
                                                            "transition-all duration-200 hover:scale-110 rounded-full",
                                                            filter.selectedWowClassName.includes(
                                                                wowClassName
                                                            )
                                                                ? "ring-2 ring-primary shadow-md shadow-primary/20"
                                                                : "opacity-40 grayscale hover:opacity-70 hover:grayscale-0"
                                                        )}
                                                    >
                                                        <Image
                                                            src={
                                                                classIcon.get(
                                                                    wowClassName
                                                                ) ?? ""
                                                            }
                                                            alt={wowClassName}
                                                            width={28}
                                                            height={28}
                                                            className="w-7 h-7 rounded-full"
                                                            title={wowClassName}
                                                            unoptimized
                                                        />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Slot Filter */}
                                {showSlotFilter && (
                                    <div className="space-y-2">
                                        <SectionHeader>Item Slot</SectionHeader>
                                        <div className="flex flex-wrap gap-1.5">
                                            {wowItemSlotKeySchema.options.map((slot) => (
                                                <button
                                                    key={slot}
                                                    onClick={() => {
                                                        toggleSlot(slot)
                                                    }}
                                                    className={cn(
                                                        "transition-all duration-200 hover:scale-110 rounded-lg",
                                                        filter.selectedSlots.includes(
                                                            slot
                                                        )
                                                            ? "ring-2 ring-primary shadow-md shadow-primary/20"
                                                            : "opacity-40 grayscale hover:opacity-70 hover:grayscale-0"
                                                    )}
                                                >
                                                    <Image
                                                        src={itemSlotIcon.get(slot) ?? ""}
                                                        alt={formatWowSlotKey(slot)}
                                                        width={28}
                                                        height={28}
                                                        className="w-7 h-7"
                                                        title={formatWowSlotKey(slot)}
                                                        unoptimized
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Armor Type Filter */}
                                {showArmorTypeFilter && (
                                    <div className="space-y-2">
                                        <SectionHeader>Armor Type</SectionHeader>
                                        <div className="flex flex-wrap gap-1.5">
                                            {wowArmorTypeSchema.options.map((type) => (
                                                <button
                                                    key={type}
                                                    onClick={() => {
                                                        toggleArmorType(type)
                                                    }}
                                                    className={cn(
                                                        "transition-all duration-200 hover:scale-110 rounded-lg",
                                                        filter.selectedArmorTypes.includes(
                                                            type
                                                        )
                                                            ? "ring-2 ring-primary shadow-md shadow-primary/20"
                                                            : "opacity-40 grayscale hover:opacity-70 hover:grayscale-0"
                                                    )}
                                                >
                                                    <Image
                                                        src={
                                                            armorTypesIcon.get(type) ?? ""
                                                        }
                                                        alt={type}
                                                        width={28}
                                                        height={28}
                                                        className="w-7 h-7"
                                                        title={type}
                                                        unoptimized
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Droptimizer Filters */}
                                {showDroptimizerFilters && (
                                    <div className="space-y-3">
                                        <SectionHeader>Droptimizer</SectionHeader>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    id="min-upgrade"
                                                    checked={filter.onlyUpgrades}
                                                    onCheckedChange={(checked) => {
                                                        updateFilter(
                                                            "onlyUpgrades",
                                                            !!checked
                                                        )
                                                    }}
                                                />
                                                <label
                                                    htmlFor="min-upgrade"
                                                    className="text-sm"
                                                >
                                                    Minimum upgrade
                                                </label>
                                                {filter.onlyUpgrades && (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="500"
                                                        value={filter.minUpgrade}
                                                        onChange={(e) => {
                                                            updateFilter(
                                                                "minUpgrade",
                                                                Number(e.target.value)
                                                            )
                                                        }}
                                                        className="w-20 px-2 py-1 text-sm border border-border/50 rounded-lg bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {/* Active Filter Chips (only show chips for filters enabled on this page) */}
                {hasAnyFilters && (
                    <>
                        <div className="w-px h-6 bg-border/50" />
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Class chips */}
                            {showClassFilter &&
                                filter.selectedWowClassName.map((className) => (
                                    <FilterChip
                                        key={className}
                                        label={className}
                                        icon={classIcon.get(className)}
                                        onRemove={() => {
                                            toggleClass(className)
                                        }}
                                    />
                                ))}
                            {/* Slot chips */}
                            {showSlotFilter &&
                                filter.selectedSlots.map((slot) => (
                                    <FilterChip
                                        key={slot}
                                        label={formatWowSlotKey(slot)}
                                        icon={itemSlotIcon.get(slot)}
                                        onRemove={() => {
                                            toggleSlot(slot)
                                        }}
                                    />
                                ))}
                            {/* Armor type chips */}
                            {showArmorTypeFilter &&
                                filter.selectedArmorTypes.map((type) => (
                                    <FilterChip
                                        key={type}
                                        label={type}
                                        icon={armorTypesIcon.get(type)}
                                        onRemove={() => {
                                            toggleArmorType(type)
                                        }}
                                    />
                                ))}
                            {/* Droptimizer filter chips */}
                            {showDroptimizerFilters && filter.onlyUpgrades && (
                                <FilterChip
                                    label={`Min ${s(filter.minUpgrade)} DPS`}
                                    onRemove={() => {
                                        updateFilter("onlyUpgrades", false)
                                    }}
                                />
                            )}
                        </div>
                    </>
                )}

                {/* Clear All Button */}
                {hasAnyFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetFilter}
                        className="ml-auto text-muted-foreground hover:text-foreground"
                    >
                        <RotateCcw className="w-4 h-4 mr-1.5" />
                        Clear
                    </Button>
                )}
            </div>
        </GlassCard>
    )
}

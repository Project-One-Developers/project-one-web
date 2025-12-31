"use client"

import Image from "next/image"
import { Checkbox } from "@/components/ui/checkbox"
import { GlassCard } from "@/components/ui/glass-card"
import { SectionHeader } from "@/components/ui/section-header"
import type { LootFilter } from "@/lib/filters"
import { cn } from "@/lib/utils"
import { armorTypesIcon, classIcon, itemSlotIcon, raidDiffIcon } from "@/lib/wow-icon"
import { formatWowSlotKey } from "@/shared/libs/items/item-slot-utils"
import {
    wowArmorTypeSchema,
    wowClassNameSchema,
    wowItemSlotKeySchema,
    type WowArmorType,
    type WowClassName,
    type WowItemSlotKey,
    type WowRaidDifficulty,
} from "@/shared/models/wow.model"

type FiltersPanelProps = {
    filter: LootFilter
    updateFilter: <K extends keyof LootFilter>(key: K, value: LootFilter[K]) => void
    className?: string
    showRaidDifficulty?: boolean
    showMainsAlts?: boolean
    showDroptimizerFilters?: boolean
    showClassFilter?: boolean
    showSlotFilter?: boolean
    showArmorTypeFilter?: boolean
}

export const FiltersPanel = ({
    filter,
    updateFilter,
    className,
    showRaidDifficulty = true,
    showMainsAlts = true,
    showDroptimizerFilters = true,
    showClassFilter = true,
    showSlotFilter = true,
    showArmorTypeFilter = true,
}: FiltersPanelProps) => {
    const toggleSlot = (slotName: WowItemSlotKey) => {
        const newSelectedSlots = filter.selectedSlots.includes(slotName)
            ? filter.selectedSlots.filter((slot) => slot !== slotName)
            : [...filter.selectedSlots, slotName]
        updateFilter("selectedSlots", newSelectedSlots)
    }

    const toggleArmorType = (armorType: WowArmorType) => {
        const newSelectedArmorTypes = filter.selectedArmorTypes.includes(armorType)
            ? filter.selectedArmorTypes.filter((type) => type !== armorType)
            : [...filter.selectedArmorTypes, armorType]
        updateFilter("selectedArmorTypes", newSelectedArmorTypes)
    }

    const toggleWowClass = (wowClassName: WowClassName) => {
        const newSelectedWowClassName = filter.selectedWowClassName.includes(wowClassName)
            ? filter.selectedWowClassName.filter((type) => type !== wowClassName)
            : [...filter.selectedWowClassName, wowClassName]
        updateFilter("selectedWowClassName", newSelectedWowClassName)
    }

    const selectDifficulty = (difficulty: WowRaidDifficulty) => {
        updateFilter("selectedRaidDiff", difficulty)
    }

    const renderContent = () => (
        <div className="space-y-4">
            {/* Raid Difficulty Selector */}
            {showRaidDifficulty && (
                <div className="space-y-2">
                    <SectionHeader>Difficulty</SectionHeader>
                    <div className="flex flex-wrap gap-2">
                        {(["Normal", "Heroic", "Mythic"] as WowRaidDifficulty[]).map(
                            (difficulty) => (
                                <div
                                    key={difficulty}
                                    className={cn(
                                        "cursor-pointer transition-all duration-200 hover:scale-105 rounded-xl overflow-hidden",
                                        filter.selectedRaidDiff.includes(difficulty)
                                            ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                                            : "opacity-50 grayscale hover:opacity-80 hover:grayscale-0"
                                    )}
                                    onClick={() => {
                                        selectDifficulty(difficulty)
                                    }}
                                >
                                    <Image
                                        src={raidDiffIcon.get(difficulty) ?? ""}
                                        alt={difficulty}
                                        width={64}
                                        height={64}
                                        className="w-14 h-14 object-cover"
                                        title={difficulty}
                                        unoptimized
                                    />
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* Character Type Filters */}
            {showMainsAlts && (
                <div className="space-y-2">
                    <SectionHeader>Characters</SectionHeader>
                    <div className="flex flex-wrap gap-3">
                        <div
                            className={cn(
                                "cursor-pointer transition-all duration-200 hover:scale-105 rounded-xl overflow-hidden flex flex-col items-center",
                                filter.showMains
                                    ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                                    : "opacity-50 grayscale hover:opacity-80 hover:grayscale-0"
                            )}
                            onClick={() => {
                                updateFilter("showMains", !filter.showMains)
                            }}
                        >
                            <Image
                                src="/icons/char-main.png"
                                alt="Main Characters"
                                width={40}
                                height={40}
                                className="w-10 h-10 object-cover"
                                title="Main Characters"
                                unoptimized
                            />
                            <span className="text-[10px] font-medium text-muted-foreground mt-1">
                                Mains
                            </span>
                        </div>
                        <div
                            className={cn(
                                "cursor-pointer transition-all duration-200 hover:scale-105 rounded-xl overflow-hidden flex flex-col items-center",
                                filter.showAlts
                                    ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                                    : "opacity-50 grayscale hover:opacity-80 hover:grayscale-0"
                            )}
                            onClick={() => {
                                updateFilter("showAlts", !filter.showAlts)
                            }}
                        >
                            <Image
                                src="/icons/char-alt.png"
                                alt="Alt Characters"
                                width={40}
                                height={40}
                                className="w-10 h-10 object-cover"
                                title="Alt Characters"
                                unoptimized
                            />
                            <span className="text-[10px] font-medium text-muted-foreground mt-1">
                                Alts
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Class Filter */}
            {showClassFilter && (
                <div className="space-y-2">
                    <SectionHeader>Class</SectionHeader>
                    <div className="flex flex-wrap gap-1.5">
                        {wowClassNameSchema.options.map((wowClassName) => (
                            <div
                                key={wowClassName}
                                className={cn(
                                    "cursor-pointer transition-all duration-200 hover:scale-110 rounded-full",
                                    filter.selectedWowClassName.includes(wowClassName)
                                        ? "ring-2 ring-primary shadow-md shadow-primary/20"
                                        : "opacity-40 grayscale hover:opacity-70 hover:grayscale-0"
                                )}
                                onClick={() => {
                                    toggleWowClass(wowClassName)
                                }}
                            >
                                <Image
                                    src={classIcon.get(wowClassName) ?? ""}
                                    alt={wowClassName}
                                    width={28}
                                    height={28}
                                    className="w-7 h-7 object-cover rounded-full"
                                    title={wowClassName}
                                    unoptimized
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Item Slot Filter */}
            {showSlotFilter && (
                <div className="space-y-2">
                    <SectionHeader>Item Slot</SectionHeader>
                    <div className="flex flex-wrap gap-1.5">
                        {wowItemSlotKeySchema.options.map((slotName) => (
                            <div
                                key={slotName}
                                className={cn(
                                    "cursor-pointer transition-all duration-200 hover:scale-110 rounded-lg",
                                    filter.selectedSlots.includes(slotName)
                                        ? "ring-2 ring-primary shadow-md shadow-primary/20"
                                        : "opacity-40 grayscale hover:opacity-70 hover:grayscale-0"
                                )}
                                onClick={() => {
                                    toggleSlot(slotName)
                                }}
                            >
                                <Image
                                    src={itemSlotIcon.get(slotName) ?? ""}
                                    alt={formatWowSlotKey(slotName)}
                                    width={28}
                                    height={28}
                                    className="w-7 h-7 object-cover"
                                    title={formatWowSlotKey(slotName)}
                                    unoptimized
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Armor Type Filter */}
            {showArmorTypeFilter && (
                <div className="space-y-2">
                    <SectionHeader>Armor Type</SectionHeader>
                    <div className="flex flex-wrap gap-1.5">
                        {wowArmorTypeSchema.options.map((armorType) => (
                            <div
                                key={armorType}
                                className={cn(
                                    "cursor-pointer transition-all duration-200 hover:scale-110 rounded-lg",
                                    filter.selectedArmorTypes.includes(armorType)
                                        ? "ring-2 ring-primary shadow-md shadow-primary/20"
                                        : "opacity-40 grayscale hover:opacity-70 hover:grayscale-0"
                                )}
                                onClick={() => {
                                    toggleArmorType(armorType)
                                }}
                            >
                                <Image
                                    src={armorTypesIcon.get(armorType) ?? ""}
                                    alt={armorType}
                                    width={28}
                                    height={28}
                                    className="w-7 h-7 object-cover"
                                    title={armorType}
                                    unoptimized
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Droptimizer-specific filters */}
            {showDroptimizerFilters && (
                <div className="space-y-3">
                    <SectionHeader>Droptimizer</SectionHeader>
                    <div className="space-y-3">
                        {/* Upgrades only and Minimum Upgrade Amount in the same row */}
                        <div className="flex flex-row items-center gap-3">
                            <Checkbox
                                id="only-upgrades"
                                checked={filter.onlyUpgrades}
                                onCheckedChange={(checked) => {
                                    updateFilter("onlyUpgrades", !!checked)
                                }}
                            />
                            <label
                                htmlFor="only-upgrades"
                                className="text-sm text-foreground"
                            >
                                Minimum upgrade
                            </label>
                            {filter.onlyUpgrades && (
                                <input
                                    id="upgrade-amount"
                                    type="number"
                                    min="0"
                                    step="500"
                                    value={filter.minUpgrade}
                                    onChange={(e) => {
                                        updateFilter("minUpgrade", Number(e.target.value))
                                    }}
                                    disabled={!filter.onlyUpgrades}
                                    className="border border-border/50 rounded-lg bg-background/50 text-foreground w-20 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            )}
                        </div>

                        {/* Hide if no upgrade */}
                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="hide-no-upgrades"
                                checked={filter.hideIfNoUpgrade}
                                onCheckedChange={(checked) => {
                                    updateFilter("hideIfNoUpgrade", !!checked)
                                }}
                            />
                            <label
                                htmlFor="hide-no-upgrades"
                                className="text-sm text-foreground"
                            >
                                Hide if no upgrade
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )

    return (
        <GlassCard
            variant="solid"
            padding="lg"
            className={cn(
                "backdrop-blur-none bg-card shadow-2xl shadow-black/20",
                className
            )}
        >
            {renderContent()}
        </GlassCard>
    )
}

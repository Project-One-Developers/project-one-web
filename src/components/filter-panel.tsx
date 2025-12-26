"use client"

import { Checkbox } from "@/components/ui/checkbox"
import type { LootFilter } from "@/lib/filters"
import { armorTypesIcon, classIcon, itemSlotIcon, raidDiffIcon } from "@/lib/wow-icon"
import { formatWowSlotKey } from "@/shared/libs/items/item-slot-utils"
import {
    wowArmorTypeSchema,
    wowClassNameSchema,
    wowItemSlotKeySchema,
} from "@/shared/schemas/wow.schemas"
import type {
    WowArmorType,
    WowClassName,
    WowItemSlotKey,
    WowRaidDifficulty,
} from "@/shared/types/types"
import { cn } from "@/lib/utils"
import Image from "next/image"

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
        <div className="space-y-3">
            {/* Raid Difficulty Selector */}
            {showRaidDifficulty && (
                <fieldset className="border-t border-gray-700 pt-2">
                    <legend className="text-sm font-semibold text-white mb-2">
                        Difficulty
                    </legend>
                    <div className="flex flex-wrap gap-2">
                        {(["Normal", "Heroic", "Mythic"] as WowRaidDifficulty[]).map(
                            (difficulty) => (
                                <div
                                    key={difficulty}
                                    className={cn(
                                        "cursor-pointer transition-transform hover:scale-110 rounded-lg overflow-hidden",
                                        filter.selectedRaidDiff.includes(difficulty)
                                            ? "ring-2 ring-blue-500 shadow-lg"
                                            : "opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
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
                                        className="w-16 h-16 object-cover"
                                        title={difficulty}
                                        unoptimized
                                    />
                                </div>
                            )
                        )}
                    </div>
                </fieldset>
            )}

            {/* Character Type Filters */}
            {showMainsAlts && (
                <fieldset className="border-t border-gray-700 pt-2">
                    <legend className="text-sm font-semibold text-white mb-2">
                        Characters
                    </legend>
                    <div className="flex flex-wrap gap-2">
                        <div
                            className={cn(
                                "cursor-pointer transition-transform hover:scale-105 rounded-lg overflow-hidden",
                                filter.showMains
                                    ? "ring-2 ring-blue-500 shadow-lg"
                                    : "opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
                            )}
                            onClick={() => {
                                updateFilter("showMains", !filter.showMains)
                            }}
                        >
                            <div className="w-10 h-10 bg-green-600 flex items-center justify-center text-white font-bold text-lg">
                                M
                            </div>
                            <div className="text-center text-[10px] mt-0.5 font-semibold">
                                Mains
                            </div>
                        </div>
                        <div
                            className={cn(
                                "cursor-pointer transition-transform hover:scale-105 rounded-lg overflow-hidden",
                                filter.showAlts
                                    ? "ring-2 ring-blue-500 shadow-lg"
                                    : "opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
                            )}
                            onClick={() => {
                                updateFilter("showAlts", !filter.showAlts)
                            }}
                        >
                            <div className="w-10 h-10 bg-orange-600 flex items-center justify-center text-white font-bold text-lg">
                                A
                            </div>
                            <div className="text-center text-[10px] mt-0.5 font-semibold">
                                Alts
                            </div>
                        </div>
                    </div>
                </fieldset>
            )}

            {/* Class Filter */}
            {showClassFilter && (
                <fieldset className="border-t border-gray-700 pt-2">
                    <legend className="text-sm font-semibold text-white mb-2">
                        Class
                    </legend>
                    <div className="flex flex-wrap gap-1">
                        {wowClassNameSchema.options.map((wowClassName) => (
                            <div
                                key={wowClassName}
                                className={cn(
                                    "cursor-pointer transition-transform hover:scale-110 rounded-full",
                                    filter.selectedWowClassName.includes(wowClassName)
                                        ? "ring-2 ring-blue-500"
                                        : "opacity-50 grayscale"
                                )}
                                onClick={() => {
                                    toggleWowClass(wowClassName)
                                }}
                            >
                                <Image
                                    src={classIcon.get(wowClassName) ?? ""}
                                    alt={wowClassName}
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 object-cover rounded-full"
                                    title={wowClassName}
                                    unoptimized
                                />
                            </div>
                        ))}
                    </div>
                </fieldset>
            )}

            {/* Item Slot Filter */}
            {showSlotFilter && (
                <fieldset className="border-t border-gray-700 pt-2">
                    <legend className="text-sm font-semibold text-white mb-2">
                        Item Slot
                    </legend>
                    <div className="flex flex-wrap gap-1">
                        {wowItemSlotKeySchema.options.map((slotName) => (
                            <div
                                key={slotName}
                                className={cn(
                                    "cursor-pointer transition-transform hover:scale-110 rounded-md",
                                    filter.selectedSlots.includes(slotName)
                                        ? "ring-2 ring-blue-500"
                                        : "opacity-50 grayscale"
                                )}
                                onClick={() => {
                                    toggleSlot(slotName)
                                }}
                            >
                                <Image
                                    src={itemSlotIcon.get(slotName) ?? ""}
                                    alt={formatWowSlotKey(slotName)}
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 object-cover"
                                    title={formatWowSlotKey(slotName)}
                                    unoptimized
                                />
                            </div>
                        ))}
                    </div>
                </fieldset>
            )}

            {/* Armor Type Filter */}
            {showArmorTypeFilter && (
                <fieldset className="border-t border-gray-700 pt-2">
                    <legend className="text-sm font-semibold text-white mb-2">
                        Armor Type
                    </legend>
                    <div className="flex flex-wrap gap-1">
                        {wowArmorTypeSchema.options.map((armorType) => (
                            <div
                                key={armorType}
                                className={cn(
                                    "cursor-pointer transition-transform hover:scale-110 rounded-md",
                                    filter.selectedArmorTypes.includes(armorType)
                                        ? "ring-2 ring-blue-500"
                                        : "opacity-50 grayscale"
                                )}
                                onClick={() => {
                                    toggleArmorType(armorType)
                                }}
                            >
                                <Image
                                    src={armorTypesIcon.get(armorType) ?? ""}
                                    alt={armorType}
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 object-cover"
                                    title={armorType}
                                    unoptimized
                                />
                            </div>
                        ))}
                    </div>
                </fieldset>
            )}

            {/* Droptimizer-specific filters */}
            {showDroptimizerFilters && (
                <fieldset className="border-t border-gray-700 pt-2">
                    <legend className="text-lg font-semibold text-white mb-1">
                        Droptimizer
                    </legend>
                    <div className="space-y-4">
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
                                className="text-sm font-semibold"
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
                                    className="border rounded-md bg-transparent text-white w-20 px-2 py-1"
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
                                className="text-sm font-semibold"
                            >
                                Hide if no upgrade
                            </label>
                        </div>
                    </div>
                </fieldset>
            )}
        </div>
    )

    return (
        <div
            className={cn("bg-gray-800 border border-gray-600 rounded-lg p-3", className)}
        >
            {renderContent()}
        </div>
    )
}

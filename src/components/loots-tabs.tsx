"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { itemSlotIcon } from "@/lib/wow-icon"
import { formatWowSlotKey } from "@/shared/libs/items/item-slot-utils"
import type { LootWithAssigned } from "@/shared/models/loot.models"
import { wowItemSlotKeySchema, type WowItemSlotKey } from "@/shared/models/wow.models"
import { GlassCard } from "./ui/glass-card"
import { Input } from "./ui/input"
import { WowClassIcon } from "./wow/wow-class-icon"
import { WowGearIcon } from "./wow/wow-gear-icon"

const TOKENS_ICON_URL =
    "https://wow.zamimg.com/images/wow/icons/large/inv_axe_2h_nerubianraid_d_01_nv.jpg"

type LootsTabsProps = {
    loots: LootWithAssigned[]
    selectedLoot: LootWithAssigned | null
    setSelectedLoot: (loot: LootWithAssigned) => void
}

type SlotCount = { total: number; assigned: number }

function SlotButton({
    slot,
    count,
    isSelected,
    onClick,
}: {
    slot: WowItemSlotKey | "tokens"
    count: SlotCount
    isSelected: boolean
    onClick: () => void
}) {
    const isComplete = count.assigned === count.total
    const iconSrc = slot === "tokens" ? TOKENS_ICON_URL : (itemSlotIcon.get(slot) ?? "")
    const title = slot === "tokens" ? "Tokens" : formatWowSlotKey(slot)

    return (
        <div className="flex flex-col items-center">
            <span
                className={cn(
                    "text-xs font-bold",
                    isComplete ? "text-green-400" : "text-foreground"
                )}
            >
                {count.assigned}/{count.total}
            </span>
            <button
                type="button"
                onClick={onClick}
                className={cn(
                    "flex flex-col items-center gap-1 p-1 border-b-2 transition-all",
                    isSelected ? "border-primary" : "border-transparent"
                )}
            >
                <Image
                    src={iconSrc}
                    alt={slot}
                    width={32}
                    height={32}
                    className="w-8 h-8 hover:scale-110 transition-transform cursor-pointer rounded-sm"
                    title={title}
                    unoptimized
                />
            </button>
        </div>
    )
}

function LootListItem({
    loot,
    isSelected,
    showSlotInfo,
    onClick,
}: {
    loot: LootWithAssigned
    isSelected: boolean
    showSlotInfo: boolean
    onClick: () => void
}) {
    return (
        <div
            className={cn(
                "flex flex-row justify-between items-center p-2 rounded-md cursor-pointer transition-colors",
                "border border-transparent hover:border-border hover:bg-muted/50",
                isSelected && "bg-muted border-border"
            )}
            onClick={onClick}
        >
            <WowGearIcon
                gearItem={loot.gearItem}
                showSlot={showSlotInfo}
                showTiersetLine
                showExtendedInfo
                convertItemTrackToRaidDiff={true}
                showRoleIcons={true}
                showArmorType={!showSlotInfo}
            />
            {loot.assignedCharacter && (
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium text-foreground">
                        {loot.assignedCharacter.name}
                    </span>
                    <WowClassIcon
                        wowClassName={loot.assignedCharacter.class}
                        className="h-8 w-8 border-2 border-background rounded-lg shrink-0"
                    />
                </div>
            )}
        </div>
    )
}

export default function LootsTabs({
    loots,
    selectedLoot,
    setSelectedLoot,
}: LootsTabsProps) {
    const [selectedSlot, setSelectedSlot] = useState<WowItemSlotKey | "tokens">("head")
    const [searchQuery, setSearchQuery] = useState("")

    // Filter loots by search query
    const searchFilteredLoots = useMemo(() => {
        if (!searchQuery.trim()) {
            return loots
        }
        const query = searchQuery.toLowerCase()
        return loots.filter((loot) =>
            loot.gearItem.item.name.toLowerCase().includes(query)
        )
    }, [loots, searchQuery])

    // Calculate counts per slot
    const lootCounts = useMemo(() => {
        return searchFilteredLoots.reduce<Partial<Record<WowItemSlotKey, SlotCount>>>(
            (acc, loot) => {
                const slot = loot.gearItem.item.slotKey
                acc[slot] ??= { total: 0, assigned: 0 }
                acc[slot].total++
                if (loot.assignedCharacter) {
                    acc[slot].assigned++
                }
                return acc
            },
            {}
        )
    }, [searchFilteredLoots])

    // Calculate token counts
    const tokensLoots = useMemo(() => {
        return searchFilteredLoots.filter(
            (loot) => loot.gearItem.item.tierset || loot.gearItem.item.token
        )
    }, [searchFilteredLoots])

    const tokensCount = useMemo<SlotCount>(() => {
        return tokensLoots.reduce(
            (acc, loot) => {
                acc.total++
                if (loot.assignedCharacter) {
                    acc.assigned++
                }
                return acc
            },
            { total: 0, assigned: 0 }
        )
    }, [tokensLoots])

    // Filter and sort loots for display
    const filteredLoots = useMemo(() => {
        const lootsToFilter =
            selectedSlot === "tokens" ? tokensLoots : searchFilteredLoots
        const filtered =
            selectedSlot === "tokens"
                ? lootsToFilter
                : lootsToFilter.filter(
                      (loot) => loot.gearItem.item.slotKey === selectedSlot
                  )

        return filtered.sort(
            (a, b) =>
                a.gearItem.item.name.localeCompare(b.gearItem.item.name) ||
                b.gearItem.itemLevel - a.gearItem.itemLevel
        )
    }, [selectedSlot, searchFilteredLoots, tokensLoots])

    return (
        <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <Input
                type="text"
                placeholder="Search loots by name..."
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.target.value)
                }}
            />

            {/* Slot Tabs */}
            <div className="flex flex-wrap gap-2">
                {wowItemSlotKeySchema.options.map((slot) => {
                    const count = lootCounts[slot]
                    if (!count || count.total === 0) {
                        return null
                    }
                    return (
                        <SlotButton
                            key={slot}
                            slot={slot}
                            count={count}
                            isSelected={selectedSlot === slot}
                            onClick={() => {
                                setSelectedSlot(slot)
                            }}
                        />
                    )
                })}
                {tokensCount.total > 0 && (
                    <SlotButton
                        slot="tokens"
                        count={tokensCount}
                        isSelected={selectedSlot === "tokens"}
                        onClick={() => {
                            setSelectedSlot("tokens")
                        }}
                    />
                )}
            </div>

            {/* Loot List */}
            <GlassCard padding="sm" className="flex flex-col gap-1">
                {filteredLoots.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                        {searchQuery.trim()
                            ? "No loots match your search"
                            : "No loot in this category"}
                    </p>
                ) : (
                    filteredLoots.map((loot) => (
                        <LootListItem
                            key={loot.id}
                            loot={loot}
                            isSelected={selectedLoot?.id === loot.id}
                            showSlotInfo={selectedSlot === "tokens"}
                            onClick={() => {
                                setSelectedLoot(loot)
                            }}
                        />
                    ))
                )}
            </GlassCard>
        </div>
    )
}

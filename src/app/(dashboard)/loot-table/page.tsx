"use client"

import Image from "next/image"
import { useState, useMemo, type JSX } from "react"
import { LoaderCircle, ExternalLink, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useRaidItems } from "@/lib/queries/items"
import { ITEM_SLOTS_DESC, ARMOR_TYPES } from "@/shared/consts/wow.consts"
import type { Item } from "@/shared/types/types"

// Group items by boss for display
function groupItemsByBoss(items: Item[]): Map<string, Item[]> {
    const groups = new Map<string, Item[]>()
    for (const item of items) {
        const boss = item.bossName
        const existing = groups.get(boss)
        if (existing) {
            existing.push(item)
        } else {
            groups.set(boss, [item])
        }
    }
    return groups
}

function ItemRow({ item }: { item: Item }) {
    return (
        <TableRow>
            <TableCell className="w-12">
                <Image
                    src={item.iconUrl}
                    alt={item.name}
                    width={32}
                    height={32}
                    className="rounded"
                />
            </TableCell>
            <TableCell>
                <a
                    href={item.wowheadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                >
                    {item.name}
                    <ExternalLink className="h-3 w-3" />
                </a>
            </TableCell>
            <TableCell className="text-muted-foreground">{item.slot}</TableCell>
            <TableCell className="text-muted-foreground">
                {item.armorType ?? "-"}
            </TableCell>
            <TableCell className="text-center">{item.ilvlMythic}</TableCell>
            <TableCell>
                {item.tierset && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                        Tier
                    </span>
                )}
                {item.token && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 ml-1">
                        Token
                    </span>
                )}
                {item.veryRare && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400 ml-1">
                        Rare
                    </span>
                )}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs max-w-48 truncate">
                {item.specs?.join(", ") ?? "All specs"}
            </TableCell>
        </TableRow>
    )
}

export default function LootTablePage(): JSX.Element {
    const { data: items, isLoading, error } = useRaidItems()
    const [searchTerm, setSearchTerm] = useState("")
    const [slotFilter, setSlotFilter] = useState<string>("all")
    const [armorFilter, setArmorFilter] = useState<string>("all")

    const filteredItems = useMemo(() => {
        if (!items) {
            return []
        }
        return items.filter((item) => {
            // Search filter
            if (
                searchTerm &&
                !item.name.toLowerCase().includes(searchTerm.toLowerCase())
            ) {
                return false
            }
            // Slot filter
            if (slotFilter !== "all" && item.slot !== slotFilter) {
                return false
            }
            // Armor type filter
            if (armorFilter !== "all" && item.armorType !== armorFilter) {
                return false
            }
            return true
        })
    }, [items, searchTerm, slotFilter, armorFilter])

    const groupedItems = useMemo(() => groupItemsByBoss(filteredItems), [filteredItems])

    if (isLoading) {
        return (
            <div className="w-full min-h-screen flex flex-col gap-y-8 items-center justify-center p-8">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="w-full min-h-screen flex flex-col gap-y-8 items-center p-8">
                <h1 className="text-3xl font-bold">Loot Table</h1>
                <div className="bg-destructive/10 p-4 rounded-lg">
                    <p className="text-destructive">
                        Error loading items: {error.message}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen flex flex-col gap-y-6 p-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Loot Table</h1>
                <p className="text-muted-foreground">
                    Browse raid loot with BIS information.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value)
                        }}
                        className="pl-9 w-64"
                    />
                </div>
                <Select value={slotFilter} onValueChange={setSlotFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Slots" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Slots</SelectItem>
                        {ITEM_SLOTS_DESC.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                                {slot}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={armorFilter} onValueChange={setArmorFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Armor" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Armor</SelectItem>
                        {ARMOR_TYPES.map((armor) => (
                            <SelectItem key={armor} value={armor}>
                                {armor}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                    {filteredItems.length} items
                </span>
            </div>

            {/* Items Table grouped by boss */}
            {Array.from(groupedItems.entries()).map(([bossName, bossItems]) => (
                <div key={bossName} className="space-y-2">
                    <h2 className="text-lg font-semibold text-primary">{bossName}</h2>
                    <div className="rounded-lg border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12"></TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Slot</TableHead>
                                    <TableHead>Armor</TableHead>
                                    <TableHead className="text-center">ilvl</TableHead>
                                    <TableHead>Tags</TableHead>
                                    <TableHead>Specs</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bossItems.map((item) => (
                                    <ItemRow key={item.id} item={item} />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            ))}

            {groupedItems.size === 0 && (
                <div className="bg-muted p-8 rounded-lg text-center">
                    <p className="text-muted-foreground">
                        No items found matching your filters.
                    </p>
                </div>
            )}
        </div>
    )
}

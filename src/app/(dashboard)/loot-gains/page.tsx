"use client"

import type { JSX } from "react"
import { useState, useMemo } from "react"
import { LoaderCircle, ExternalLink, Search, TrendingUp } from "lucide-react"
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
import { WowClassIcon } from "@/components/wow/wow-class-icon"
import { useLatestDroptimizers } from "@/lib/queries/droptimizers"
import { RAID_DIFF } from "@/shared/consts/wow.consts"
import type {
    Droptimizer,
    DroptimizerUpgrade,
    WowClassName,
    WowRaidDifficulty,
} from "@/shared/types/types"

// Type for aggregated upgrade data
type UpgradeWithChar = {
    upgrade: DroptimizerUpgrade
    charName: string
    charSpec: string
    charClass: WowClassName
}

// Group upgrades by boss
function groupUpgradesByBoss(
    droptimizers: Droptimizer[],
    difficultyFilter: WowRaidDifficulty | "all"
): Map<string, UpgradeWithChar[]> {
    const groups = new Map<string, UpgradeWithChar[]>()

    for (const droptimizer of droptimizers) {
        // Filter by difficulty
        if (
            difficultyFilter !== "all" &&
            droptimizer.raidInfo.difficulty !== difficultyFilter
        ) {
            continue
        }

        for (const upgrade of droptimizer.upgrades) {
            const bossName = upgrade.item.bossName
            if (!groups.has(bossName)) {
                groups.set(bossName, [])
            }
            groups.get(bossName)!.push({
                upgrade,
                charName: droptimizer.charInfo.name,
                charSpec: droptimizer.charInfo.spec,
                charClass: droptimizer.charInfo.class,
            })
        }
    }

    // Sort upgrades by DPS gain within each boss
    for (const [, upgrades] of groups) {
        upgrades.sort((a, b) => b.upgrade.dps - a.upgrade.dps)
    }

    return groups
}

// Format DPS number with commas
function formatDps(dps: number): string {
    return dps.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

function UpgradeRow({ data }: { data: UpgradeWithChar }) {
    const { upgrade, charName, charSpec, charClass } = data

    return (
        <TableRow>
            <TableCell className="w-12">
                <img
                    src={upgrade.item.iconUrl}
                    alt={upgrade.item.name}
                    className="w-8 h-8 rounded"
                />
            </TableCell>
            <TableCell>
                <a
                    href={upgrade.item.wowheadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                >
                    {upgrade.item.name}
                    <ExternalLink className="h-3 w-3" />
                </a>
            </TableCell>
            <TableCell className="text-muted-foreground">{upgrade.item.slot}</TableCell>
            <TableCell className="text-center">{upgrade.ilvl}</TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <WowClassIcon wowClassName={charClass} className="w-5 h-5" />
                    <span>{charName}</span>
                    <span className="text-muted-foreground text-xs">({charSpec})</span>
                </div>
            </TableCell>
            <TableCell className="text-right">
                <span className="inline-flex items-center gap-1 text-green-500 font-medium">
                    <TrendingUp className="h-4 w-4" />+{formatDps(upgrade.dps)}
                </span>
            </TableCell>
        </TableRow>
    )
}

export default function LootGainsPage(): JSX.Element {
    const { data: droptimizers, isLoading, error } = useLatestDroptimizers()
    const [searchTerm, setSearchTerm] = useState("")
    const [difficultyFilter, setDifficultyFilter] = useState<WowRaidDifficulty | "all">(
        "all"
    )

    const groupedUpgrades = useMemo((): Map<string, UpgradeWithChar[]> => {
        if (!droptimizers) return new Map()
        return groupUpgradesByBoss(droptimizers, difficultyFilter)
    }, [droptimizers, difficultyFilter])

    // Apply search filter
    const filteredGroups = useMemo((): Map<string, UpgradeWithChar[]> => {
        if (!searchTerm) return groupedUpgrades

        const filtered = new Map<string, UpgradeWithChar[]>()
        for (const [bossName, upgrades] of groupedUpgrades) {
            const matchingUpgrades = upgrades.filter(
                (data) =>
                    data.upgrade.item.name
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    data.charName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    bossName.toLowerCase().includes(searchTerm.toLowerCase())
            )
            if (matchingUpgrades.length > 0) {
                filtered.set(bossName, matchingUpgrades)
            }
        }
        return filtered
    }, [groupedUpgrades, searchTerm])

    // Calculate total DPS gain
    const totalDpsGain = useMemo(() => {
        let total = 0
        for (const [, upgrades] of filteredGroups) {
            for (const data of upgrades) {
                total += data.upgrade.dps
            }
        }
        return total
    }, [filteredGroups])

    // Count unique items
    const uniqueItemCount = useMemo(() => {
        const items = new Set<number>()
        for (const [, upgrades] of filteredGroups) {
            for (const data of upgrades) {
                items.add(data.upgrade.item.id)
            }
        }
        return items.size
    }, [filteredGroups])

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
                <h1 className="text-3xl font-bold">Loot Gains</h1>
                <div className="bg-destructive/10 p-4 rounded-lg">
                    <p className="text-destructive">
                        Error loading droptimizers: {error.message}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen flex flex-col gap-y-6 p-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Loot Gains</h1>
                <p className="text-muted-foreground">
                    Upgrade potential from droptimizers grouped by boss encounter.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search items, characters, bosses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-80"
                    />
                </div>
                <Select
                    value={difficultyFilter}
                    onValueChange={(v) =>
                        setDifficultyFilter(v as WowRaidDifficulty | "all")
                    }
                >
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Difficulties" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Difficulties</SelectItem>
                        {RAID_DIFF.filter((d) => d !== "LFR").map((diff) => (
                            <SelectItem key={diff} value={diff.toLowerCase()}>
                                {diff}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Stats Summary */}
            <div className="flex gap-6 p-4 bg-muted rounded-lg">
                <div>
                    <p className="text-sm text-muted-foreground">Total Potential Gains</p>
                    <p className="text-2xl font-bold text-green-500">
                        +{formatDps(totalDpsGain)} DPS
                    </p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Unique Items</p>
                    <p className="text-2xl font-bold">{uniqueItemCount}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Boss Encounters</p>
                    <p className="text-2xl font-bold">{filteredGroups.size}</p>
                </div>
            </div>

            {/* Upgrades Table grouped by boss */}
            {Array.from(filteredGroups.entries()).map(([bossName, upgrades]) => {
                const bossTotalDps = upgrades.reduce((sum, u) => sum + u.upgrade.dps, 0)
                return (
                    <div key={bossName} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-primary">
                                {bossName}
                            </h2>
                            <span className="text-sm text-green-500 font-medium">
                                +{formatDps(bossTotalDps)} total DPS
                            </span>
                        </div>
                        <div className="rounded-lg border bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12"></TableHead>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Slot</TableHead>
                                        <TableHead className="text-center">
                                            ilvl
                                        </TableHead>
                                        <TableHead>Character</TableHead>
                                        <TableHead className="text-right">
                                            DPS Gain
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {upgrades.map((data, idx) => (
                                        <UpgradeRow
                                            key={`${data.upgrade.id}-${data.charName}-${idx}`}
                                            data={data}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )
            })}

            {filteredGroups.size === 0 && (
                <div className="bg-muted p-8 rounded-lg text-center">
                    <p className="text-muted-foreground">
                        {droptimizers?.length === 0
                            ? "No droptimizers found. Import some simulations to see loot gains."
                            : "No upgrades found matching your filters."}
                    </p>
                </div>
            )}
        </div>
    )
}

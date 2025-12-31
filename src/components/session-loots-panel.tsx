"use client"

import { LoaderCircle, X } from "lucide-react"
import { useMemo } from "react"
import { useBosses } from "@/lib/queries/bosses"
import { useDeleteLoot, useLootsBySessionWithItem } from "@/lib/queries/loots"
import type { LootWithItem } from "@/shared/models/loot.model"
import type { WowRaidDifficulty } from "@/shared/models/wow.model"
import { WowGearIcon } from "./wow/wow-gear-icon"

type SessionLootsPanelProps = {
    raidSessionId: string
}

type GroupedLoots = Record<number, Record<string, LootWithItem[]>>

export function SessionLootsPanel({ raidSessionId }: SessionLootsPanelProps) {
    const { data: loots, isLoading: isLoadingLoots } =
        useLootsBySessionWithItem(raidSessionId)
    const { data: bosses, isLoading: isLoadingBosses } = useBosses()
    const deleteLootMutation = useDeleteLoot()

    // Memoize sorted bosses
    const orderedBosses = useMemo(() => {
        if (!bosses) {
            return []
        }
        return [...bosses].sort((a, b) => a.order - b.order)
    }, [bosses])

    // Memoize grouped loots & total token counts
    const { groupedLoots, allDifficulties, tokenSums } = useMemo(() => {
        const grouped: GroupedLoots = {}
        const difficultyOrder: WowRaidDifficulty[] = ["Mythic", "Heroic", "Normal"]
        const tokenSums: Record<WowRaidDifficulty, number> = {
            Mythic: 0,
            Heroic: 0,
            Normal: 0,
            LFR: 0,
        }

        if (!loots) {
            return { groupedLoots: grouped, allDifficulties: [], tokenSums }
        }

        for (const loot of loots) {
            const { bossId } = loot.item
            const difficulty = loot.raidDifficulty

            grouped[bossId] ??= {}
            grouped[bossId][difficulty] ??= []

            grouped[bossId][difficulty].push(loot)

            if (loot.gearItem.item.token) {
                tokenSums[difficulty] += 1
            }
        }

        const uniqueDifficulties = Array.from(
            new Set(loots.map((loot) => loot.raidDifficulty))
        ).sort((a, b) => difficultyOrder.indexOf(a) - difficultyOrder.indexOf(b))

        return { groupedLoots: grouped, allDifficulties: uniqueDifficulties, tokenSums }
    }, [loots])

    if (isLoadingLoots || isLoadingBosses) {
        return (
            <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                <LoaderCircle className="animate-spin text-5xl" />
            </div>
        )
    }

    if (Object.keys(groupedLoots).length === 0) {
        return (
            <div className="text-muted-foreground text-center py-4">
                No items looted yet
            </div>
        )
    }

    return (
        <div className="mb-4 overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className="p-2 text-left text-sm font-semibold">Boss</th>
                        {allDifficulties.map((difficulty) => (
                            <th
                                key={difficulty}
                                className="p-2 text-left text-sm font-semibold"
                            >
                                {difficulty}{" "}
                                <span className="text-muted-foreground font-normal">
                                    ({tokenSums[difficulty]} tokens)
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {orderedBosses
                        .filter((boss) => groupedLoots[boss.id])
                        .map((boss) => (
                            <tr key={boss.id} className="border-t border-border">
                                <td className="p-2 font-semibold text-sm">{boss.name}</td>
                                {allDifficulties.map((difficulty) => (
                                    <td key={difficulty} className="p-2">
                                        <div className="flex flex-row gap-2 flex-wrap">
                                            {groupedLoots[boss.id]?.[difficulty]
                                                ?.sort((a, b) => a.itemId - b.itemId)
                                                .map((loot) => (
                                                    <div
                                                        key={loot.id}
                                                        className="relative group"
                                                    >
                                                        <WowGearIcon
                                                            gearItem={loot.gearItem}
                                                            showTiersetLine={true}
                                                            showItemTrackDiff={false}
                                                            showRoleIcons={true}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                deleteLootMutation.execute(
                                                                    {
                                                                        lootId: loot.id,
                                                                    }
                                                                )
                                                            }}
                                                            className="absolute -top-2 -right-2 hidden group-hover:flex items-center justify-center w-5 h-5 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                )) ?? (
                                                <span className="text-muted-foreground">
                                                    -
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                </tbody>
            </table>
        </div>
    )
}

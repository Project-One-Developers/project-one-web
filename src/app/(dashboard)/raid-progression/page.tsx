"use client"

import { groupBy, partition, sortBy } from "es-toolkit"
import { Search } from "lucide-react"
import { useEffect, useMemo, useState, type JSX } from "react"
import { FilterBar } from "@/components/filter-bar"
import { GlassCard } from "@/components/ui/glass-card"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { BossCard } from "@/components/wow/boss-card"
import { WowCharacterIcon } from "@/components/wow/wow-character-icon"
import { FilterProvider, useFilterContext } from "@/lib/filter-context"
import { useBosses, useRosterProgression } from "@/lib/queries/bosses"
import { s } from "@/lib/safe-stringify"
import { defined } from "@/lib/utils"
import type { BlizzardEncounter } from "@/shared/models/blizzard.model"
import type { Boss } from "@/shared/models/boss.model"
import type { Character } from "@/shared/models/character.model"
import type { WowRaidDifficulty } from "@/shared/models/wow.model"

// Constants
const ROLE_COLORS = {
    Tank: "text-blue-400",
    Healer: "text-green-400",
    DPS: "text-red-400",
} as const

// Types
type CharacterEncounterInfo = {
    character: Character
    encounter: BlizzardEncounter | null
}

type BossProgressData = {
    defeated: GroupedByRole<CharacterEncounterInfo>
    notDefeated: CharacterEncounterInfo[]
    defeatedCount: number
}

type GroupedByRole<T> = {
    Tank: T[]
    Healer: T[]
    DPS: T[]
}

type BossPanelProps = {
    boss: Boss
    progressData: BossProgressData
    totalRosterSize: number
    selectedDifficulty: WowRaidDifficulty
}

// Components
const CharacterTooltip = ({
    character,
    encounter,
}: {
    character: Character
    encounter?: BlizzardEncounter | WowRaidDifficulty | null
}) => (
    <div className="flex flex-col gap-1">
        <div className="font-medium">{character.name}</div>
        {encounter && typeof encounter === "object" ? (
            <>
                <div className="text-green-400">Kills: {encounter.numKills}</div>
                {encounter.lastDefeated && (
                    <div className="text-zinc-400">
                        Last Kill: {new Date(encounter.lastDefeated).toLocaleDateString()}
                    </div>
                )}
            </>
        ) : (
            <div className="text-red-400">Not defeated on {encounter}</div>
        )}
    </div>
)

const CharacterGrid = ({
    characters,
    title,
    color,
    selectedDifficulty,
    showRoleBadges = false,
    hasDefeatedBoss = false,
}: {
    characters: CharacterEncounterInfo[]
    title: string
    color: string
    selectedDifficulty?: WowRaidDifficulty
    showRoleBadges?: boolean
    hasDefeatedBoss?: boolean
}) => {
    if (characters.length === 0) {
        return null
    }

    return (
        <div>
            <h4 className={`text-xs font-semibold ${color} mb-2`}>{title}</h4>
            <div className="grid grid-cols-8 gap-2">
                {characters.map((item) => {
                    const { character, encounter } = item

                    return (
                        <Tooltip key={character.id}>
                            <TooltipTrigger asChild>
                                <div className="flex justify-center">
                                    <WowCharacterIcon
                                        character={character}
                                        showName={false}
                                        showTooltip={false}
                                        showMainIndicator={false}
                                        showRoleBadges={
                                            showRoleBadges && !hasDefeatedBoss
                                        }
                                    />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={5}>
                                <CharacterTooltip
                                    character={character}
                                    encounter={encounter ?? selectedDifficulty}
                                />
                            </TooltipContent>
                        </Tooltip>
                    )
                })}
            </div>
        </div>
    )
}

const BossPanel = ({
    boss,
    progressData,
    totalRosterSize,
    selectedDifficulty,
}: BossPanelProps) => {
    const { defeated, notDefeated, defeatedCount } = progressData

    return (
        <BossCard
            bossId={boss.id}
            bossName={boss.name}
            className="min-w-[280px]"
            contentClassName="p-4"
        >
            <div className="text-xs text-center text-muted-foreground mb-3">
                {defeatedCount} / {totalRosterSize} defeated
            </div>

            {/* Characters who have defeated the boss - grouped by role */}
            {defeatedCount > 0 && (
                <div className="flex flex-col gap-y-3">
                    <CharacterGrid
                        characters={defeated.Tank}
                        title="Tanks"
                        color={ROLE_COLORS.Tank}
                        showRoleBadges={true}
                        hasDefeatedBoss={true}
                    />
                    <CharacterGrid
                        characters={defeated.Healer}
                        title="Healers"
                        color={ROLE_COLORS.Healer}
                        showRoleBadges={true}
                        hasDefeatedBoss={true}
                    />
                    <CharacterGrid
                        characters={defeated.DPS}
                        title="DPS"
                        color={ROLE_COLORS.DPS}
                        showRoleBadges={true}
                        hasDefeatedBoss={true}
                    />
                </div>
            )}

            {/* Characters who have NOT defeated the boss */}
            {notDefeated.length > 0 && (
                <div className="flex flex-col gap-y-2 mt-4">
                    <h3 className="text-xs font-semibold text-red-400">Not Defeated</h3>
                    <div className="grid grid-cols-8 gap-2 opacity-60">
                        {notDefeated.map((item) => (
                            <Tooltip key={item.character.id}>
                                <TooltipTrigger asChild>
                                    <div className="flex justify-center grayscale">
                                        <WowCharacterIcon
                                            character={item.character}
                                            showTooltip={false}
                                            showRoleBadges={true}
                                            showName={true}
                                            showMainIndicator={false}
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent sideOffset={5}>
                                    <CharacterTooltip
                                        character={item.character}
                                        encounter={selectedDifficulty}
                                    />
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {defeatedCount === 0 && notDefeated.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-4">
                    No characters found
                </div>
            )}
        </BossCard>
    )
}

// Main Component
export default function RaidProgressionPage(): JSX.Element {
    return (
        <FilterProvider defaultFilter={{ selectedRaidDiff: "Heroic" }}>
            <RaidProgressionPageContent />
        </FilterProvider>
    )
}

function RaidProgressionPageContent(): JSX.Element {
    const { filter } = useFilterContext()
    const [searchQuery, setSearchQuery] = useState("")
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")

    // Queries
    const bossesQuery = useBosses()

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery.trim())
        }, 300)

        return () => {
            clearTimeout(handler)
        }
    }, [searchQuery])

    const orderedBosses = useMemo(() => {
        if (!bossesQuery.data) {
            return []
        }
        return bossesQuery.data
            .filter(
                (b): b is Boss & { blizzardEncounterId: number } =>
                    b.id > 0 && defined(b.blizzardEncounterId)
            )
            .sort((a, b) => a.order - b.order)
    }, [bossesQuery.data])

    // Get raid slug from first boss (all bosses in same raid)
    const raidSlug = orderedBosses[0]?.raidSlug ?? undefined

    // Fetch roster progression with pre-built encounter maps from server
    const rosterProgressionQuery = useRosterProgression(
        filter.showMains,
        filter.showAlts,
        raidSlug
    )

    // Build set of filtered names for O(1) lookup
    const filteredNamesSet = useMemo(() => {
        if (!debouncedSearchQuery || !rosterProgressionQuery.data) {
            return null // null means no filter active
        }

        const searchLower = debouncedSearchQuery.toLowerCase()
        return new Set(
            rosterProgressionQuery.data
                .filter(({ p1Character }) =>
                    p1Character.name.toLowerCase().includes(searchLower)
                )
                .map(({ p1Character }) => p1Character.name)
        )
    }, [rosterProgressionQuery.data, debouncedSearchQuery])

    // Pre-compute all boss progress data in a single pass
    const progressByBoss = useMemo(() => {
        if (!rosterProgressionQuery.data) {
            return new Map<number, BossProgressData>()
        }

        // Filter characters once if search is active
        const activeCharacters = filteredNamesSet
            ? rosterProgressionQuery.data.filter(({ p1Character }) =>
                  filteredNamesSet.has(p1Character.name)
              )
            : rosterProgressionQuery.data

        return new Map(
            orderedBosses.map((boss) => {
                const allWithEncounters = activeCharacters.map(
                    ({ p1Character, encounters }) => ({
                        character: p1Character,
                        encounter:
                            encounters[
                                `${filter.selectedRaidDiff}-${s(boss.blizzardEncounterId)}`
                            ] ?? null,
                    })
                )

                const [defeated, notDefeated] = partition(
                    allWithEncounters,
                    (item) => item.encounter !== null
                )

                // Group defeated by role and sort by class
                const defeatedByRole = groupBy(
                    defeated,
                    (item) => item.character.role
                ) as Partial<Record<string, CharacterEncounterInfo[]>>

                const byClass = (items: CharacterEncounterInfo[]) =>
                    sortBy(items, [(item) => item.character.class])

                return [
                    boss.id,
                    {
                        defeated: {
                            Tank: byClass(defeatedByRole.Tank ?? []),
                            Healer: byClass(defeatedByRole.Healer ?? []),
                            DPS: byClass(defeatedByRole.DPS ?? []),
                        },
                        notDefeated: byClass(notDefeated),
                        defeatedCount: defeated.length,
                    },
                ] as const
            })
        )
    }, [
        orderedBosses,
        rosterProgressionQuery.data,
        filter.selectedRaidDiff,
        filteredNamesSet,
    ])

    // Calculate total roster size (filtered or not)
    const totalRosterSize = useMemo(() => {
        if (filteredNamesSet) {
            return filteredNamesSet.size
        }
        return rosterProgressionQuery.data?.length ?? 0
    }, [rosterProgressionQuery.data, filteredNamesSet])

    if (bossesQuery.isLoading || rosterProgressionQuery.isLoading) {
        return <LoadingSpinner size="lg" iconSize="lg" text="Loading progression..." />
    }

    return (
        <div className="w-full min-h-screen overflow-y-auto flex flex-col gap-y-6 p-8">
            {/* Filter Bar with Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <FilterBar
                    showRaidDifficulty={true}
                    showMainsAlts={true}
                    showDroptimizerFilters={false}
                    showClassFilter={false}
                    showSlotFilter={false}
                    showArmorTypeFilter={false}
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
                            placeholder="Search players..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                            }}
                            className="w-full pl-10 bg-transparent border-0 focus-visible:ring-0"
                        />
                    </div>
                </GlassCard>
            </div>

            {/* Info */}
            <p className="text-muted-foreground text-sm text-center">
                Showing {filter.selectedRaidDiff} progression for{" "}
                {s((rosterProgressionQuery.data ?? []).length)} characters
                {debouncedSearchQuery && (
                    <span className="text-primary">
                        {" "}
                        (filtered by &quot;{debouncedSearchQuery}&quot;)
                    </span>
                )}
            </p>

            {/* Boss List */}
            <div className="flex flex-wrap gap-4 justify-center">
                {orderedBosses.map((boss) => {
                    const progressData = progressByBoss.get(boss.id)
                    if (!progressData) {
                        return null
                    }

                    return (
                        <BossPanel
                            key={boss.id}
                            boss={boss}
                            progressData={progressData}
                            totalRosterSize={totalRosterSize}
                            selectedDifficulty={filter.selectedRaidDiff}
                        />
                    )
                })}
            </div>
        </div>
    )
}

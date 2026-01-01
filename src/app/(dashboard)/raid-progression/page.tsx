"use client"

import { Search } from "lucide-react"
import { useEffect, useMemo, useState, type JSX } from "react"
import { FilterBar } from "@/components/filter-bar"
import { GlassCard } from "@/components/ui/glass-card"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { BossCard } from "@/components/wow/boss-card"
import { WowCharacterIcon } from "@/components/wow/wow-character-icon"
import { useFilterContext } from "@/lib/filter-context"
import { useBosses, useRosterProgression } from "@/lib/queries/bosses"
import { defined } from "@/lib/utils"
import type { Boss } from "@/shared/models/boss.models"
import type {
    DefeatedCharacter,
    ProgressionCharacter,
} from "@/shared/models/character.models"
import type { WowRaidDifficulty } from "@/shared/models/wow.models"

// Constants
const ROLE_COLORS = {
    Tank: "text-blue-400",
    Healer: "text-green-400",
    DPS: "text-red-400",
} as const

// Types for filtered/displayed data
type FilteredBossProgress = {
    defeated: {
        Tank: DefeatedCharacter[]
        Healer: DefeatedCharacter[]
        DPS: DefeatedCharacter[]
    }
    notDefeated: ProgressionCharacter[]
    defeatedCount: number
    totalCount: number
}

type BossPanelProps = {
    boss: Boss
    progressData: FilteredBossProgress
    selectedDifficulty: WowRaidDifficulty
}

// Components
const CharacterTooltip = ({
    character,
    defeated,
    selectedDifficulty,
}: {
    character: ProgressionCharacter | DefeatedCharacter
    defeated: boolean
    selectedDifficulty: WowRaidDifficulty
}) => (
    <div className="flex flex-col gap-1">
        <div className="font-medium">{character.name}</div>
        {defeated && "numKills" in character ? (
            <>
                <div className="text-green-400">Kills: {character.numKills}</div>
                {character.lastDefeated && (
                    <div className="text-zinc-400">
                        Last Kill: {new Date(character.lastDefeated).toLocaleDateString()}
                    </div>
                )}
            </>
        ) : (
            <div className="text-red-400">Not defeated on {selectedDifficulty}</div>
        )}
    </div>
)

const DefeatedCharacterGrid = ({
    characters,
    title,
    color,
    selectedDifficulty,
}: {
    characters: DefeatedCharacter[]
    title: string
    color: string
    selectedDifficulty: WowRaidDifficulty
}) => {
    if (characters.length === 0) {
        return null
    }

    return (
        <div>
            <h4 className={`text-xs font-semibold ${color} mb-2`}>{title}</h4>
            <div className="grid grid-cols-8 gap-2">
                {characters.map((character) => (
                    <Tooltip key={character.id}>
                        <TooltipTrigger asChild>
                            <div className="flex justify-center">
                                <WowCharacterIcon
                                    character={character}
                                    showName={false}
                                    showTooltip={false}
                                    showMainIndicator={false}
                                    showRoleBadges={false}
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={5}>
                            <CharacterTooltip
                                character={character}
                                defeated={true}
                                selectedDifficulty={selectedDifficulty}
                            />
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>
        </div>
    )
}

const BossPanel = ({ boss, progressData, selectedDifficulty }: BossPanelProps) => {
    const { defeated, notDefeated, defeatedCount, totalCount } = progressData

    return (
        <BossCard
            bossId={boss.id}
            bossName={boss.name}
            className="min-w-70"
            contentClassName="p-4"
        >
            <div className="text-xs text-center text-muted-foreground mb-3">
                {defeatedCount} / {totalCount} defeated
            </div>

            {/* Characters who have defeated the boss - grouped by role */}
            {defeatedCount > 0 && (
                <div className="flex flex-col gap-y-3">
                    <DefeatedCharacterGrid
                        characters={defeated.Tank}
                        title="Tanks"
                        color={ROLE_COLORS.Tank}
                        selectedDifficulty={selectedDifficulty}
                    />
                    <DefeatedCharacterGrid
                        characters={defeated.Healer}
                        title="Healers"
                        color={ROLE_COLORS.Healer}
                        selectedDifficulty={selectedDifficulty}
                    />
                    <DefeatedCharacterGrid
                        characters={defeated.DPS}
                        title="DPS"
                        color={ROLE_COLORS.DPS}
                        selectedDifficulty={selectedDifficulty}
                    />
                </div>
            )}

            {/* Characters who have NOT defeated the boss */}
            {notDefeated.length > 0 && (
                <div className="flex flex-col gap-y-2 mt-4">
                    <h3 className="text-xs font-semibold text-red-400">Not Defeated</h3>
                    <div className="grid grid-cols-8 gap-2 opacity-60">
                        {notDefeated.map((character) => (
                            <Tooltip key={character.id}>
                                <TooltipTrigger asChild>
                                    <div className="flex justify-center grayscale">
                                        <WowCharacterIcon
                                            character={character}
                                            showTooltip={false}
                                            showRoleBadges={true}
                                            showName={true}
                                            showMainIndicator={false}
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent sideOffset={5}>
                                    <CharacterTooltip
                                        character={character}
                                        defeated={false}
                                        selectedDifficulty={selectedDifficulty}
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

// Helper to filter characters by mains/alts and search
// searchQueryLower should be pre-computed to avoid repeated toLowerCase() calls
const filterCharacter = (
    char: ProgressionCharacter,
    showMains: boolean,
    showAlts: boolean,
    searchQueryLower: string
): boolean => {
    // Mains/alts filter
    if (char.main && !showMains) {
        return false
    }
    if (!char.main && !showAlts) {
        return false
    }
    // Search filter (searchQueryLower is already lowercase)
    if (searchQueryLower && !char.name.toLowerCase().includes(searchQueryLower)) {
        return false
    }
    return true
}

// Main Component
export default function RaidProgressionPage(): JSX.Element {
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

    // Fetch roster progression (pre-computed by difficulty -> bossId)
    const rosterProgressionQuery = useRosterProgression(raidSlug)

    // Select current difficulty data and filter by mains/alts/search
    // Note: We only track Mythic/Heroic/Normal, not LFR
    const progressByBoss = useMemo(() => {
        if (!rosterProgressionQuery.data) {
            return new Map<number, FilteredBossProgress>()
        }

        // Only Mythic/Heroic/Normal are tracked - return empty for LFR
        const selectedDiff = filter.selectedRaidDiff
        if (
            selectedDiff !== "Mythic" &&
            selectedDiff !== "Heroic" &&
            selectedDiff !== "Normal"
        ) {
            return new Map<number, FilteredBossProgress>()
        }

        const difficultyData = rosterProgressionQuery.data[selectedDiff]

        // Pre-compute lowercase search query once (avoids repeated toLowerCase in filter)
        const searchLower = debouncedSearchQuery.toLowerCase()

        // Create filter function with captured values to avoid repeated closures
        const matchesFilter = (c: ProgressionCharacter) =>
            filterCharacter(c, filter.showMains, filter.showAlts, searchLower)

        return new Map(
            orderedBosses.map((boss) => {
                const bossProgress = difficultyData[boss.id]
                if (!bossProgress) {
                    // Boss not in data - return empty progress
                    const emptyProgress: FilteredBossProgress = {
                        defeated: { Tank: [], Healer: [], DPS: [] },
                        notDefeated: [],
                        defeatedCount: 0,
                        totalCount: 0,
                    }
                    return [boss.id, emptyProgress] as const
                }

                // Filter each role's defeated characters
                const filteredDefeatedTank =
                    bossProgress.defeated.Tank.filter(matchesFilter)
                const filteredDefeatedHealer =
                    bossProgress.defeated.Healer.filter(matchesFilter)
                const filteredDefeatedDPS =
                    bossProgress.defeated.DPS.filter(matchesFilter)

                // Filter not-defeated characters
                const filteredNotDefeated = bossProgress.notDefeated.filter(matchesFilter)

                const defeatedCount =
                    filteredDefeatedTank.length +
                    filteredDefeatedHealer.length +
                    filteredDefeatedDPS.length

                const progress: FilteredBossProgress = {
                    defeated: {
                        Tank: filteredDefeatedTank,
                        Healer: filteredDefeatedHealer,
                        DPS: filteredDefeatedDPS,
                    },
                    notDefeated: filteredNotDefeated,
                    defeatedCount,
                    totalCount: defeatedCount + filteredNotDefeated.length,
                }

                return [boss.id, progress] as const
            })
        )
    }, [
        rosterProgressionQuery.data,
        filter.selectedRaidDiff,
        filter.showMains,
        filter.showAlts,
        debouncedSearchQuery,
        orderedBosses,
    ])

    const isLoading = bossesQuery.isLoading || rosterProgressionQuery.isLoading

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

            {/* Loading State */}
            {isLoading && (
                <LoadingSpinner size="lg" iconSize="lg" text="Loading progression..." />
            )}

            {/* Boss List */}
            {!isLoading && (
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
                                selectedDifficulty={filter.selectedRaidDiff}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    )
}

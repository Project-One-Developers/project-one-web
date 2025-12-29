"use client"

import { groupBy, partition } from "es-toolkit"
import { LoaderCircle } from "lucide-react"
import Image from "next/image"
import { useEffect, useMemo, useState, type JSX } from "react"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { WowCharacterIcon } from "@/components/wow/wow-character-icon"
import { useBosses, useRosterProgression } from "@/lib/queries/bosses"
import { defined } from "@/lib/utils"
import { encounterIcon } from "@/lib/wow-icon"
import type { Boss } from "@/shared/models/boss.model"
import type { Character } from "@/shared/models/character.model"
import type { RaiderioEncounter } from "@/shared/models/raiderio.model"
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
    encounter: RaiderioEncounter | null
}

type EncounterMap = Map<string, RaiderioEncounter>

type CharacterWithEncounterMap = {
    p1Character: Character
    encounterMap: EncounterMap
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

// Utility: Sort by class within role groups
const sortByClass = <T extends { character: { class: string } }>(items: T[]): T[] =>
    items.toSorted((a, b) => a.character.class.localeCompare(b.character.class))

// Components
const CharacterTooltip = ({
    character,
    encounter,
}: {
    character: Character
    encounter?: RaiderioEncounter | WowRaidDifficulty | null
}) => (
    <div className="flex flex-col gap-1">
        <div className="font-medium">{character.name}</div>
        {encounter && typeof encounter === "object" ? (
            <>
                <div className="text-green-400">Kills: {encounter.numKills}</div>
                <div className="text-zinc-300">
                    First kill ilvl: {encounter.itemLevel}
                </div>
                {encounter.firstDefeated && (
                    <div className="text-zinc-400">
                        First Kill:{" "}
                        {new Date(encounter.firstDefeated).toLocaleDateString()}
                    </div>
                )}
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
        <div className="flex flex-col bg-muted rounded-lg overflow-hidden min-w-[280px]">
            {/* Boss header */}
            <div className="flex flex-col gap-y-2">
                <Image
                    src={encounterIcon.get(boss.id) || ""}
                    alt={`${boss.name} icon`}
                    width={280}
                    height={128}
                    className="w-full h-32 object-scale-down"
                />
                <h2 className="text-center text-xs font-bold">{boss.name}</h2>
            </div>

            {/* Character progression */}
            <div className="flex flex-col gap-y-3 p-4">
                <div className="text-xs text-center text-gray-400 mb-2">
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
                        <h3 className="text-xs font-semibold text-red-400">
                            Not Defeated
                        </h3>
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
                    <div className="text-center text-gray-500 text-sm py-4">
                        No characters found
                    </div>
                )}
            </div>
        </div>
    )
}

// Main Component
export default function RaidProgressionPage(): JSX.Element {
    // Local state for filters
    const [showMains, setShowMains] = useState(true)
    const [showAlts, setShowAlts] = useState(true)
    const [selectedRaidDiff, setSelectedRaidDiff] = useState<WowRaidDifficulty>("Heroic")
    const [searchQuery, setSearchQuery] = useState("")
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")

    // Queries
    const bossesQuery = useBosses()
    const rosterProgressionQuery = useRosterProgression(showMains, showAlts)

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
                (b): b is Boss & { raiderioEncounterSlug: string } =>
                    b.id > 0 && defined(b.raiderioEncounterSlug)
            )
            .sort((a, b) => a.order - b.order)
    }, [bossesQuery.data])

    // Pre-process roster data: build encounter maps for O(1) boss lookups
    const charactersWithEncounterMaps = useMemo((): CharacterWithEncounterMap[] => {
        if (!rosterProgressionQuery.data || orderedBosses.length === 0) {
            return []
        }

        // Get the raid slug from first boss (all bosses in same raid)
        const raidSlug = orderedBosses[0]?.raiderioRaidSlug
        if (!raidSlug) {
            return []
        }

        const difficulties = ["normal", "heroic", "mythic"] as const

        return rosterProgressionQuery.data.map(({ p1Character, raiderIo }) => {
            const currentRaid = raiderIo?.progress.raidProgress.find(
                (rp) => rp.raid === raidSlug
            )

            // Build Map for O(1) encounter lookups: "difficulty-bossSlug" -> encounter
            const encounterMap: EncounterMap = currentRaid
                ? new Map<string, RaiderioEncounter>(
                      difficulties.flatMap((diff) =>
                          (currentRaid.encountersDefeated[diff] ?? []).map(
                              (encounter) =>
                                  [`${diff}-${encounter.slug}`, encounter] as const
                          )
                      )
                  )
                : new Map<string, RaiderioEncounter>()

            return { p1Character, encounterMap }
        })
    }, [rosterProgressionQuery.data, orderedBosses])

    // Build set of filtered names for O(1) lookup
    const filteredNamesSet = useMemo(() => {
        if (!debouncedSearchQuery) {
            return null // null means no filter active
        }

        const searchLower = debouncedSearchQuery.toLowerCase()
        return new Set(
            charactersWithEncounterMaps
                .filter(({ p1Character }) =>
                    p1Character.name.toLowerCase().includes(searchLower)
                )
                .map(({ p1Character }) => p1Character.name)
        )
    }, [charactersWithEncounterMaps, debouncedSearchQuery])

    // Pre-compute all boss progress data in a single pass
    const progressByBoss = useMemo(() => {
        const diffKey = selectedRaidDiff.toLowerCase()

        // Filter characters once if search is active
        const activeCharacters = filteredNamesSet
            ? charactersWithEncounterMaps.filter(({ p1Character }) =>
                  filteredNamesSet.has(p1Character.name)
              )
            : charactersWithEncounterMaps

        return new Map(
            orderedBosses.map((boss) => {
                const allWithEncounters = activeCharacters.map(
                    ({ p1Character, encounterMap }) => ({
                        character: p1Character,
                        encounter:
                            encounterMap.get(
                                `${diffKey}-${boss.raiderioEncounterSlug}`
                            ) ?? null,
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
                const groupedDefeated: GroupedByRole<CharacterEncounterInfo> = {
                    Tank: sortByClass(defeatedByRole.Tank ?? []),
                    Healer: sortByClass(defeatedByRole.Healer ?? []),
                    DPS: sortByClass(defeatedByRole.DPS ?? []),
                }

                return [
                    boss.id,
                    {
                        defeated: groupedDefeated,
                        notDefeated: sortByClass(notDefeated),
                        defeatedCount: defeated.length,
                    },
                ] as const
            })
        )
    }, [orderedBosses, charactersWithEncounterMaps, selectedRaidDiff, filteredNamesSet])

    // Calculate total roster size (filtered or not)
    const totalRosterSize = useMemo(() => {
        if (filteredNamesSet) {
            return filteredNamesSet.size
        }
        return charactersWithEncounterMaps.length
    }, [charactersWithEncounterMaps, filteredNamesSet])

    if (bossesQuery.isLoading || rosterProgressionQuery.isLoading) {
        return (
            <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                <LoaderCircle className="animate-spin text-5xl" />
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen overflow-y-auto flex flex-col gap-y-8 items-center p-8 relative">
            {/* Header */}
            <div className="text-center mb-4">
                <h1 className="text-2xl font-bold">Raid Progression</h1>
                <p className="text-gray-400">
                    Showing {selectedRaidDiff} difficulty progression for{" "}
                    {(rosterProgressionQuery.data ?? []).length} characters
                    {debouncedSearchQuery && (
                        <span className="text-blue-400">
                            {" "}
                            (filtered by &quot;{debouncedSearchQuery}&quot;)
                        </span>
                    )}
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center justify-center">
                {/* Search Bar */}
                <div className="w-full max-w-md">
                    <Input
                        type="text"
                        placeholder="Search player names..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                        }}
                        className="w-full"
                    />
                </div>

                {/* Difficulty Select */}
                <Select
                    value={selectedRaidDiff}
                    onValueChange={(value) => {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Select options match type
                        setSelectedRaidDiff(value as WowRaidDifficulty)
                    }}
                >
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Heroic">Heroic</SelectItem>
                        <SelectItem value="Mythic">Mythic</SelectItem>
                    </SelectContent>
                </Select>

                {/* Mains/Alts filter */}
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setShowMains(!showMains)
                        }}
                        className={`px-3 py-1 rounded text-sm ${
                            showMains
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-gray-400"
                        }`}
                    >
                        Mains
                    </button>
                    <button
                        onClick={() => {
                            setShowAlts(!showAlts)
                        }}
                        className={`px-3 py-1 rounded text-sm ${
                            showAlts
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-gray-400"
                        }`}
                    >
                        Alts
                    </button>
                </div>
            </div>

            {/* Boss List */}
            <div className="flex flex-wrap gap-x-4 gap-y-4 justify-center">
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
                            selectedDifficulty={selectedRaidDiff}
                        />
                    )
                })}
            </div>
        </div>
    )
}

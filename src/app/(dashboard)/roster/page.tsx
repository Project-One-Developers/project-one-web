"use client"

import {
    AlertTriangle,
    Download,
    PlusIcon,
    Search,
    Trash2,
    UserRoundPlus,
    Users,
} from "lucide-react"
import Image from "next/image"
import { type JSX, useMemo, useState } from "react"
import CharacterDialog from "@/components/character-dialog"
import PlayerDeleteDialog from "@/components/player-delete-dialog"
import PlayerDialog from "@/components/player-dialog"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { GlassCard } from "@/components/ui/glass-card"
import { IconButton } from "@/components/ui/icon-button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { StatBadge } from "@/components/ui/stat-badge"
import { CharacterOverviewIcon } from "@/components/wow/character-overview-icon"
import { usePlayersSummaryCompact } from "@/lib/queries/players"
import { s } from "@/lib/safe-stringify"
import type { Player } from "@/shared/models/character.model"
import type { PlayerWithSummaryCompact } from "@/shared/types/types"

type ItemLevelStats = {
    mean: number
    standardDeviation: number
    threshold: number
    lowCount: number
}

export default function RosterPage(): JSX.Element {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isNewCharDialogOpen, setIsNewCharDialogOpen] = useState(false)
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    const playersQuery = usePlayersSummaryCompact()

    const players = useMemo(() => playersQuery.data ?? [], [playersQuery.data])

    const itemLevelStats: ItemLevelStats = useMemo(() => {
        const playersWithChars = players.filter((p) => p.charsSummary.length > 0)
        const allCharacters = playersWithChars.flatMap((player) => player.charsSummary)
        const validItemLevels = allCharacters
            .map((char) => parseInt(char.itemLevel))
            .filter((level) => !isNaN(level) && level > 0)

        if (validItemLevels.length === 0) {
            return { mean: 0, standardDeviation: 0, threshold: 0, lowCount: 0 }
        }

        const mean =
            validItemLevels.reduce((sum, level) => sum + level, 0) /
            validItemLevels.length
        const variance =
            validItemLevels.reduce((sum, level) => sum + Math.pow(level - mean, 2), 0) /
            validItemLevels.length
        const standardDeviation = Math.sqrt(variance)
        const threshold = mean - 1.0 * standardDeviation
        const lowCount = validItemLevels.filter((level) => level < threshold).length

        return { mean, standardDeviation, threshold, lowCount }
    }, [players])

    const totalCharacters = useMemo(
        () => players.reduce((sum, p) => sum + p.charsSummary.length, 0),
        [players]
    )

    const isLowItemLevel = (itemLevel: string): boolean => {
        const level = parseInt(itemLevel)
        return !isNaN(level) && level < itemLevelStats.threshold
    }

    // Prepare CSV data for export
    const csvData = useMemo(() => {
        return players
            .filter((p) => p.charsSummary.length > 0)
            .flatMap((player) =>
                player.charsSummary.map((charSummary) => ({
                    "Player Name": player.name,
                    "Character Name": charSummary.character.name,
                    "Character Realm": charSummary.character.realm,
                    "Character Item Level": charSummary.itemLevel,
                    "Tierset Set": charSummary.tiersetCount,
                    "Raider.io URL": `https://raider.io/characters/eu/${charSummary.character.realm}/${charSummary.character.name}`,
                }))
            )
    }, [players])

    const handleExportCsv = () => {
        const firstRow = csvData[0]
        if (!firstRow) {
            return
        }

        const headers = Object.keys(firstRow)
        const csvContent = [
            headers.join(","),
            ...csvData.map((row) =>
                headers
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Dynamic CSV row access
                    .map((header) => `"${String(row[header as keyof typeof row])}"`)
                    .join(",")
            ),
        ].join("\n")

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = "roster.csv"
        link.click()
    }

    if (playersQuery.isLoading) {
        return <LoadingSpinner size="lg" iconSize="lg" text="Loading roster..." />
    }

    const filteredPlayers = players
        .sort((a, b) => a.name.localeCompare(b.name))
        .filter((player) => {
            return (
                player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                player.charsSummary
                    .map((cs) => cs.character)
                    .some((character) =>
                        character.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
            )
        })

    const handleDeleteClick = (player: PlayerWithSummaryCompact) => {
        setSelectedPlayer({ id: player.id, name: player.name })
        setIsDeleteDialogOpen(true)
    }

    const handleNewCharClick = (player: PlayerWithSummaryCompact) => {
        setSelectedPlayer({ id: player.id, name: player.name })
        setIsNewCharDialogOpen(true)
    }

    return (
        <div className="w-full min-h-screen flex flex-col p-6 md:p-8">
            {/* Header Section */}
            <div className="mb-8 space-y-6">
                {/* Search and External Links Row */}
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search players or characters..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                            }}
                            className="w-full pl-10 pr-4 py-2.5 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                        />
                    </div>

                    {/* External Site Icons */}
                    <div className="flex items-center gap-2">
                        <a
                            href="https://raider.io/guilds/eu/pozzo-delleternit%C3%A0/Project%20One"
                            rel="noreferrer"
                            target="_blank"
                            className="group relative rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 w-10 h-10 flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all duration-200"
                            title="Raider.io"
                        >
                            <Image
                                src="https://cdn.raiderio.net/images/mstile-150x150.png"
                                alt="Raider.io"
                                width={24}
                                height={24}
                                className="rounded group-hover:scale-110 transition-transform"
                            />
                        </a>
                        <a
                            href="https://www.warcraftlogs.com/guild/reports-list/633223"
                            rel="noreferrer"
                            target="_blank"
                            className="group relative rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 w-10 h-10 flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all duration-200"
                            title="WarcraftLogs"
                        >
                            <Image
                                src="https://assets.rpglogs.com/img/warcraft/favicon.png?v=4"
                                alt="WarcraftLogs"
                                width={24}
                                height={24}
                                className="rounded group-hover:scale-110 transition-transform"
                            />
                        </a>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="flex flex-wrap gap-3">
                    <StatBadge
                        icon={<Users className="w-4 h-4 text-primary" />}
                        label="Players"
                        value={s(players.length)}
                    />
                    <StatBadge
                        icon={<span className="text-primary font-bold">⚔</span>}
                        label="Characters"
                        value={s(totalCharacters)}
                    />
                    {itemLevelStats.mean > 0 && (
                        <StatBadge
                            variant="info"
                            icon={<span className="text-blue-400 font-bold">◆</span>}
                            label="Avg iLvl"
                            value={Math.round(itemLevelStats.mean)}
                        />
                    )}
                    {itemLevelStats.lowCount > 0 && (
                        <StatBadge
                            variant="warning"
                            icon={<AlertTriangle className="w-4 h-4 text-orange-400" />}
                            label="Low Gear"
                            value={s(itemLevelStats.lowCount)}
                        />
                    )}
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {filteredPlayers.map((player) => (
                    <GlassCard
                        key={player.id}
                        interactive
                        padding="lg"
                        className="group relative flex flex-col"
                    >
                        {/* Hover Actions */}
                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-destructive/20 hover:text-destructive"
                                onClick={() => {
                                    handleDeleteClick(player)
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Player Name */}
                        <h2 className="font-bold text-lg mb-4 pr-10 truncate">
                            {player.name}
                        </h2>

                        {/* Characters Row */}
                        <div className="flex items-end gap-2 mt-auto">
                            {player.charsSummary.length > 0 ? (
                                <CharacterOverviewIcon
                                    charsWithSummary={player.charsSummary}
                                    isLowItemLevel={isLowItemLevel}
                                />
                            ) : (
                                <div className="flex flex-col items-center opacity-50">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-muted/50 border-2 border-dashed border-muted-foreground/30">
                                        <Users className="w-5 h-5 text-muted-foreground/50" />
                                    </div>
                                    <span className="text-[10px] mt-1.5 text-muted-foreground/50 font-medium">
                                        No chars
                                    </span>
                                </div>
                            )}

                            {/* Add Character Button */}
                            <button
                                onClick={() => {
                                    handleNewCharClick(player)
                                }}
                                className="flex flex-col items-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105"
                            >
                                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 border border-dashed border-primary/40 hover:bg-primary/20 hover:border-primary/60 transition-colors">
                                    <PlusIcon className="w-4 h-4 text-primary" />
                                </div>
                            </button>
                        </div>
                    </GlassCard>
                ))}
            </div>

            {/* Empty State */}
            {filteredPlayers.length === 0 && (
                <EmptyState
                    icon={<Users className="w-8 h-8" />}
                    title="No players found"
                    description={
                        searchQuery
                            ? "Try adjusting your search"
                            : "Add your first player to get started"
                    }
                />
            )}

            {/* Floating Action Buttons */}
            <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
                <IconButton
                    icon={<Download className="w-5 h-5" />}
                    variant="secondary"
                    size="lg"
                    onClick={handleExportCsv}
                    title="Export Roster as CSV"
                />
                <IconButton
                    icon={<UserRoundPlus className="w-5 h-5" />}
                    variant="primary"
                    size="lg"
                    onClick={() => {
                        setIsAddDialogOpen(true)
                    }}
                    title="Add Player"
                />
            </div>

            {/* Page Dialogs */}
            {selectedPlayer && (
                <>
                    <PlayerDeleteDialog
                        isOpen={isDeleteDialogOpen}
                        setOpen={setIsDeleteDialogOpen}
                        player={selectedPlayer}
                    />
                    <CharacterDialog
                        isOpen={isNewCharDialogOpen}
                        setOpen={setIsNewCharDialogOpen}
                        mode="add"
                        player={selectedPlayer}
                    />
                </>
            )}
            <PlayerDialog isOpen={isAddDialogOpen} setOpen={setIsAddDialogOpen} />
        </div>
    )
}

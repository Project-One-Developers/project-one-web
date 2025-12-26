"use client"

import { Download, LoaderCircle, PlusIcon, UserRoundPlus, Users, X } from "lucide-react"

import Image from "next/image"
import { type JSX, useMemo, useState } from "react"

import CharacterDialog from "@/components/character-dialog"
import PlayerDeleteDialog from "@/components/player-delete-dialog"
import PlayerDialog from "@/components/player-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CharacterOverviewIcon } from "@/components/wow/character-overview-icon"
import {
    usePlayersSummary,
    type PlayerWithCharactersSummary,
} from "@/lib/queries/players"
import type { Player } from "@/shared/types/types"

type ItemLevelStats = {
    mean: number
    standardDeviation: number
    threshold: number
}

export default function RosterPage(): JSX.Element {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isNewCharDialogOpen, setIsNewCharDialogOpen] = useState(false)
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    const playersQuery = usePlayersSummary()

    const players = useMemo(() => playersQuery.data ?? [], [playersQuery.data])

    const itemLevelStats: ItemLevelStats = useMemo(() => {
        const playersWithChars = players.filter((p) => p.charsSummary.length > 0)
        const allCharacters = playersWithChars.flatMap((player) => player.charsSummary)
        const validItemLevels = allCharacters
            .map((char) => parseInt(char.itemLevel))
            .filter((level) => !isNaN(level) && level > 0)

        if (validItemLevels.length === 0) {
            return { mean: 0, standardDeviation: 0, threshold: 0 }
        }

        const mean =
            validItemLevels.reduce((sum, level) => sum + level, 0) /
            validItemLevels.length
        const variance =
            validItemLevels.reduce((sum, level) => sum + Math.pow(level - mean, 2), 0) /
            validItemLevels.length
        const standardDeviation = Math.sqrt(variance)
        const threshold = mean - 1.0 * standardDeviation

        return { mean, standardDeviation, threshold }
    }, [players])

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
                    "Tierset Set": charSummary.tierset.length,
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
        return (
            <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                <LoaderCircle className="animate-spin text-5xl" />
            </div>
        )
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

    const handleDeleteClick = (player: PlayerWithCharactersSummary) => {
        setSelectedPlayer({ id: player.id, name: player.name })
        setIsDeleteDialogOpen(true)
    }

    const handleNewCharClick = (player: PlayerWithCharactersSummary) => {
        setSelectedPlayer({ id: player.id, name: player.name })
        setIsNewCharDialogOpen(true)
    }

    return (
        <div className="w-full min-h-screen overflow-y-auto flex flex-col gap-y-8 items-center p-8 relative">
            {/* Search Bar with External Icons */}
            <div className="w-full mb-4 flex items-center gap-4">
                <Input
                    type="text"
                    placeholder="Search players or characters..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value)
                    }}
                    className="flex-1 p-3 border border-gray-300 rounded-md"
                />

                {/* External Site Icons */}
                <div className="flex items-center gap-2">
                    {/* Raider.io */}
                    <a
                        href="https://raider.io/guilds/eu/pozzo-delleternit%C3%A0/Project%20One"
                        rel="noreferrer"
                        target="_blank"
                        className="rounded-full bg-primary text-background hover:bg-primary/80 w-10 h-10 flex items-center justify-center cursor-pointer"
                    >
                        <Image
                            src="https://cdn.raiderio.net/images/mstile-150x150.png"
                            title="ProjectOne Raider.io"
                            alt="Raider.io"
                            width={40}
                            height={40}
                            className="hover:scale-125 ease-linear transition-transform"
                        />
                    </a>

                    {/* WarcraftLogs */}
                    <a
                        href="https://www.warcraftlogs.com/guild/reports-list/633223"
                        rel="noreferrer"
                        target="_blank"
                        className="rounded-full bg-primary text-background hover:bg-primary/80 w-10 h-10 flex items-center justify-center cursor-pointer"
                    >
                        <Image
                            src="https://assets.rpglogs.com/img/warcraft/favicon.png?v=4"
                            title="WoW Progress Guild Page"
                            alt="WarcraftLogs"
                            width={40}
                            height={40}
                            className="hover:scale-125 ease-linear transition-transform"
                        />
                    </a>

                    {/* WoW Audit */}
                    <a
                        href="https://wowaudit.com/eu/pozzo-delleternit%C3%A0/project-one/main/roster"
                        rel="noreferrer"
                        target="_blank"
                        className="rounded-full bg-primary text-background hover:bg-primary/80 w-10 h-10 flex items-center justify-center cursor-pointer"
                    >
                        <Image
                            src="https://data.wowaudit.com/img/new-logo-icon.svg"
                            title="WoW Audit Guild Page"
                            alt="WoW Audit"
                            width={40}
                            height={40}
                            className="hover:scale-125 ease-linear transition-transform"
                        />
                    </a>
                </div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-4">
                {filteredPlayers.map((player) => (
                    <div
                        key={player.id}
                        className="flex flex-col justify-between p-6 bg-muted h-[150px] w-[250px] rounded-lg relative"
                    >
                        {/* Top Right Menu */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-3 right-2"
                            onClick={() => {
                                handleDeleteClick(player)
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>

                        <h2 className="font-black text-2xl mb-2">{player.name}</h2>
                        <div className="flex flex-row items-center">
                            {player.charsSummary.length > 0 ? (
                                <CharacterOverviewIcon
                                    charsWithSummary={player.charsSummary}
                                    isLowItemLevel={isLowItemLevel}
                                />
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted-foreground/20 border-2 border-dashed border-muted-foreground/40">
                                        <Users className="w-6 h-6 text-muted-foreground/60" />
                                    </div>
                                    <div className="text-xs text-center mt-1 font-medium text-muted-foreground/60">
                                        No chars
                                    </div>
                                </div>
                            )}
                            <div
                                className="ml-5 mb-3"
                                onClick={() => {
                                    handleNewCharClick(player)
                                }}
                            >
                                <PlusIcon className="w-5 h-5 cursor-pointer hover:text-primary transition-colors" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Floating Buttons */}
            <div className="fixed bottom-5 right-6 flex flex-col gap-3 z-50">
                {/* Export CSV Button */}
                <button
                    onClick={handleExportCsv}
                    className="w-14 h-14 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-lg transition-all duration-200 flex items-center justify-center"
                    title="Export Roster as CSV"
                >
                    <Download className="w-6 h-6 hover:scale-110 ease-linear transition-transform" />
                </button>

                {/* Add Player Button */}
                <button
                    onClick={() => {
                        setIsAddDialogOpen(true)
                    }}
                    className="w-14 h-14 rounded-full bg-primary text-background hover:bg-primary/80 shadow-lg transition-all duration-200 flex items-center justify-center"
                    title="Add Player"
                >
                    <UserRoundPlus className="w-6 h-6" />
                </button>
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

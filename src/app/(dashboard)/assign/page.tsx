"use client"

import {
    ArrowLeft,
    BarChart,
    DownloadIcon,
    Eye,
    LoaderCircle,
    ZapIcon,
} from "lucide-react"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useState, type JSX } from "react"

import LootsEligibleChars from "@/components/loots-eligible-chars"
import LootsTabs from "@/components/loots-tabs"
import LootsTradeHelperDialog from "@/components/loots-trade-helper"
import SessionCard from "@/components/session-card"
import SessionLootNewDialog from "@/components/session-loot-new-dialog"
import SessionRosterImportDialog from "@/components/session-roster-dialog"
import { Button } from "@/components/ui/button"
import {
    convertToCSV,
    downloadCSV,
    generateLootFilename,
    prepareLootData,
    prepareStatsData,
} from "@/lib/loot/loot-utils"
import { useRaidLootTable } from "@/lib/queries/bosses"
import { useLootsBySessionsWithAssigned } from "@/lib/queries/loots"
import { useRaidSessions } from "@/lib/queries/raid-sessions"
import type { LootWithAssigned } from "@/shared/types/types"

function AssignContent(): JSX.Element {
    const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
    const [selectedLoot, setSelectedLoot] = useState<LootWithAssigned | null>(null)
    const [showAllSessions, setShowAllSessions] = useState(false)

    // Dialog states lifted to page level
    const [lootHelperDialogOpen, setLootHelperDialogOpen] = useState(false)
    const [rosterDialogOpen, setRosterDialogOpen] = useState(false)
    const [lootDialogOpen, setLootDialogOpen] = useState(false)
    const [selectedSessionId, setSelectedSessionId] = useState<string>("")

    const searchParams = useSearchParams()
    const router = useRouter()
    const defaultSessionId = searchParams.get("sessionId")

    const raidLootTable = useRaidLootTable()
    const raidSessionsQuery = useRaidSessions()
    const lootsQuery = useLootsBySessionsWithAssigned(Array.from(selectedSessions))

    const toggleSession = (sessionId: string) => {
        setSelectedSessions((prev) => {
            const newSelectedSessions = new Set(prev)
            if (newSelectedSessions.has(sessionId)) {
                newSelectedSessions.delete(sessionId)
            } else {
                newSelectedSessions.add(sessionId)
            }
            return newSelectedSessions
        })
    }

    useEffect(() => {
        if (defaultSessionId && !selectedSessions.has(defaultSessionId)) {
            toggleSession(defaultSessionId)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultSessionId])

    // Handler functions for dialog operations
    const handleEditRoster = (sessionId: string) => {
        setSelectedSessionId(sessionId)
        setRosterDialogOpen(true)
    }

    const handleLootImport = (sessionId: string) => {
        setSelectedSessionId(sessionId)
        setLootDialogOpen(true)
    }

    // Update selectedLoot.assignedCharacterId if changed in backend
    useEffect(() => {
        if (!selectedLoot || !lootsQuery.data) {
            return
        }

        // Find the latest version of the selected loot
        const updatedLoot = lootsQuery.data.find((loot) => loot.id === selectedLoot.id)
        if (!updatedLoot) {
            setSelectedLoot(null)
        } else if (updatedLoot.assignedCharacterId !== selectedLoot.assignedCharacterId) {
            setSelectedLoot(updatedLoot) // Update state with the latest data
        }
    }, [lootsQuery.data, selectedLoot])

    const sortedSessions = useMemo(
        () =>
            raidSessionsQuery.data
                ? [...raidSessionsQuery.data].sort((a, b) => b.raidDate - a.raidDate)
                : [],
        [raidSessionsQuery.data]
    )

    const loots = useMemo(() => lootsQuery.data ?? [], [lootsQuery.data])
    const visibleSessions = showAllSessions ? sortedSessions : sortedSessions.slice(0, 5)

    const handleExportLoots = () => {
        const filename = generateLootFilename(sortedSessions, selectedSessions, "loots")
        const data = prepareLootData(loots, raidLootTable.data ?? [])
        downloadCSV(convertToCSV(data), filename)
    }

    const handleExportStats = () => {
        const filename = generateLootFilename(sortedSessions, selectedSessions, "stats")
        const data = prepareStatsData(loots, raidLootTable.data ?? [])
        downloadCSV(convertToCSV(data), filename)
    }

    if (raidSessionsQuery.isLoading || lootsQuery.isLoading) {
        return (
            <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                <LoaderCircle className="animate-spin text-5xl" />
            </div>
        )
    }

    return (
        <div className="w-full h-full flex flex-col gap-y-8 p-8 relative">
            {/* Page Header with integrated back button */}
            <div className="flex bg-muted rounded-lg p-6 shadow-lg items-center relative">
                {/* Back button */}
                <Button
                    variant="ghost"
                    onClick={() => {
                        router.back()
                    }}
                    className="hover:bg-gray-800 p-2 mr-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>

                <div className="flex flex-col flex-1 gap-4">
                    {/* Compact Actions Bar */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            {selectedSessions.size > 0 && (
                                <span>
                                    {selectedSessions.size} session
                                    {selectedSessions.size !== 1 ? "s" : ""} selected
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowAllSessions(!showAllSessions)
                                }}
                                className="h-8 text-xs"
                            >
                                <Eye className="h-4 w-4 mr-1" />
                                {showAllSessions ? "Show less" : "Show all"}
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setLootHelperDialogOpen(true)
                                }}
                                disabled={selectedSessions.size === 0}
                                className="h-8 text-xs"
                            >
                                <ZapIcon className="h-4 w-4 mr-1" />
                                Trade Helper
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                disabled={selectedSessions.size === 0}
                                onClick={handleExportLoots}
                            >
                                <DownloadIcon className="h-4 w-4 mr-1" />
                                Export Loots
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                disabled={selectedSessions.size === 0}
                                onClick={handleExportStats}
                            >
                                <BarChart className="h-4 w-4 mr-1" />
                                Export Stats
                            </Button>
                        </div>
                    </div>

                    {/* Session cards */}
                    <div className="flex flex-wrap gap-4">
                        {visibleSessions.map((session) => (
                            <SessionCard
                                key={session.id}
                                session={session}
                                className={
                                    selectedSessions.has(session.id)
                                        ? "border border-primary"
                                        : ""
                                }
                                showActions={true}
                                onClick={() => {
                                    toggleSession(session.id)
                                }}
                                onEditRoster={handleEditRoster}
                                onLootImport={handleLootImport}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {selectedSessions.size > 0 ? (
                <div className="flex w-full">
                    <div className="flex flex-col flex-grow max-w-[450px] pr-5">
                        <LootsTabs
                            loots={loots}
                            selectedLoot={selectedLoot}
                            setSelectedLoot={setSelectedLoot}
                        />
                    </div>
                    <div className="flex flex-col flex-grow bg-muted p-4 rounded-lg">
                        {selectedLoot ? (
                            <LootsEligibleChars
                                allLoots={loots}
                                selectedLoot={selectedLoot}
                                setSelectedLoot={setSelectedLoot}
                            />
                        ) : (
                            <p className="text-gray-400">
                                Select a loot to start assigning
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col w-full bg-muted p-4 rounded-lg">
                    <p className="text-gray-400">
                        Select a session to start browsing loots
                    </p>
                </div>
            )}

            {/* Single instance of dialogs at page level */}
            <LootsTradeHelperDialog
                isOpen={lootHelperDialogOpen}
                setOpen={setLootHelperDialogOpen}
                loots={loots}
            />

            {selectedSessionId && (
                <>
                    <SessionRosterImportDialog
                        isOpen={rosterDialogOpen}
                        setOpen={setRosterDialogOpen}
                        raidSessionId={selectedSessionId}
                    />
                    <SessionLootNewDialog
                        isOpen={lootDialogOpen}
                        setOpen={setLootDialogOpen}
                        raidSessionId={selectedSessionId}
                    />
                </>
            )}
        </div>
    )
}

export default function AssignPage(): JSX.Element {
    return (
        <Suspense
            fallback={
                <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                    <LoaderCircle className="animate-spin text-5xl" />
                </div>
            }
        >
            <AssignContent />
        </Suspense>
    )
}

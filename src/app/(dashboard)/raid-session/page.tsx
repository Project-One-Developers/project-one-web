"use client"

import { Calendar, PlusIcon, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, type JSX } from "react"
import RaidSessionDialog from "@/components/raid-session-dialog"
import SessionCard from "@/components/session-card"
import { EmptyState } from "@/components/ui/empty-state"
import { GlassCard } from "@/components/ui/glass-card"
import { IconButton } from "@/components/ui/icon-button"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useRaidSessions } from "@/lib/queries/raid-sessions"
import { s } from "@/lib/safe-stringify"
import { unixTimestampToWowWeek } from "@/shared/libs/date/date-utils"
import type { RaidSessionWithSummary } from "@/shared/models/raid-session.model"

type GroupedSessions = Record<number, RaidSessionWithSummary[]>

export default function RaidSessionListPage(): JSX.Element {
    const [searchQuery, setSearchQuery] = useState("")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const router = useRouter()

    const { data, isLoading } = useRaidSessions()

    const { groupedSessions, weekNumbers } = useMemo(() => {
        if (!data) {
            return { groupedSessions: {}, weekNumbers: [] }
        }

        let filteredSessions = data
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filteredSessions = data.filter((session) => {
                const nameMatch = session.name.toLowerCase().includes(query)
                const wowWeek = unixTimestampToWowWeek(session.raidDate)
                const weekMatch = wowWeek.toString().includes(query)
                return nameMatch || weekMatch
            })
        }

        const grouped: GroupedSessions = {}
        filteredSessions.forEach((session) => {
            const wowWeek = unixTimestampToWowWeek(session.raidDate)
            grouped[wowWeek] ??= []
            grouped[wowWeek].push(session)
        })

        Object.keys(grouped).forEach((week) => {
            const weekSessions = grouped[Number(week)]
            if (weekSessions) {
                weekSessions.sort((a, b) => b.raidDate - a.raidDate)
            }
        })

        const weeks = Object.keys(grouped)
            .map(Number)
            .sort((a, b) => b - a)

        return { groupedSessions: grouped, weekNumbers: weeks }
    }, [data, searchQuery])

    return (
        <div className="w-full min-h-screen flex flex-col gap-y-8 p-8 relative">
            {/* Page Header */}
            <GlassCard padding="lg">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Raid Sessions</h1>
                </div>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Search by session name or WoW week..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                        }}
                        className="pl-10"
                    />
                </div>
            </GlassCard>

            {/* Loading State */}
            {isLoading && (
                <LoadingSpinner size="lg" iconSize="lg" text="Loading sessions..." />
            )}

            {/* Sessions Grouped by Week */}
            {!isLoading && (
                <div className="flex-1 overflow-y-auto">
                    <div className="space-y-8">
                        {weekNumbers.map((weekNumber) => {
                            const sessions = groupedSessions[weekNumber] ?? []
                            return (
                                <div key={weekNumber} className="space-y-4">
                                    {/* Week Header */}
                                    <div className="flex items-center gap-4">
                                        <div className="bg-primary/20 text-primary px-4 py-2 rounded-xl">
                                            <span className="font-semibold text-sm">
                                                Week {weekNumber}
                                            </span>
                                        </div>
                                        <div className="h-px bg-border/50 flex-1" />
                                        <span className="text-sm text-muted-foreground">
                                            {s(sessions.length)} session
                                            {sessions.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>

                                    {/* Sessions Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                        {sessions.map((session) => (
                                            <SessionCard
                                                key={session.id}
                                                session={session}
                                                onClick={() => {
                                                    router.push(
                                                        `/raid-session/${session.id}`
                                                    )
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {weekNumbers.length === 0 && searchQuery.trim() && (
                        <EmptyState
                            icon={<Search className="w-8 h-8" />}
                            title="No sessions found"
                            description={`No sessions found matching "${searchQuery}"`}
                        />
                    )}

                    {weekNumbers.length === 0 &&
                        !searchQuery.trim() &&
                        data?.length === 0 && (
                            <EmptyState
                                icon={<Calendar className="w-8 h-8" />}
                                title="No raid sessions yet"
                                description="Create your first session to get started"
                            />
                        )}

                    <div className="pb-20" />
                </div>
            )}

            {/* Add Session Button */}
            <div className="fixed bottom-6 right-6 z-10">
                <IconButton
                    icon={<PlusIcon className="w-5 h-5" />}
                    variant="primary"
                    size="lg"
                    onClick={() => {
                        setIsAddDialogOpen(true)
                    }}
                    title="Add new raid session"
                    className="w-14 h-14 rounded-full"
                />
            </div>

            {/* Add Session Dialog */}
            <RaidSessionDialog isOpen={isAddDialogOpen} setOpen={setIsAddDialogOpen} />
        </div>
    )
}

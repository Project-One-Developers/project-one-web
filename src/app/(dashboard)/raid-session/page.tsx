"use client"

import { LoaderCircle, PlusIcon, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, type JSX } from "react"
import RaidSessionDialog from "@/components/raid-session-dialog"
import SessionCard from "@/components/session-card"
import { Input } from "@/components/ui/input"
import { useRaidSessions } from "@/lib/queries/raid-sessions"
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

    if (isLoading) {
        return (
            <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                <LoaderCircle className="animate-spin text-5xl" />
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen flex flex-col gap-y-8 p-8 relative">
            {/* Page Header */}
            <div className="bg-muted rounded-lg p-6 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Raid Sessions</h1>
                </div>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Search by session name or WoW week..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                        }}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Sessions Grouped by Week */}
            <div className="flex-1 overflow-y-auto">
                <div className="space-y-8">
                    {weekNumbers.map((weekNumber) => {
                        const sessions = groupedSessions[weekNumber] ?? []
                        return (
                            <div key={weekNumber} className="space-y-4">
                                {/* Week Header */}
                                <div className="flex items-center gap-4">
                                    <div className="bg-primary/20 text-primary px-4 py-2 rounded-lg">
                                        <span className="font-semibold">
                                            WoW Week {weekNumber}
                                        </span>
                                    </div>
                                    <div className="h-px bg-gray-700 flex-1"></div>
                                    <span className="text-sm text-gray-400">
                                        {sessions.length} session
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
                                                router.push(`/raid-session/${session.id}`)
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {weekNumbers.length === 0 && searchQuery.trim() && (
                    <div className="text-center text-gray-400 mt-8">
                        No sessions found matching &quot;{searchQuery}&quot;
                    </div>
                )}

                {weekNumbers.length === 0 &&
                    !searchQuery.trim() &&
                    data?.length === 0 && (
                        <div className="text-center text-gray-400 mt-8">
                            No raid sessions yet. Create your first session!
                        </div>
                    )}

                <div className="pb-20"></div>
            </div>

            {/* Add Session Button */}
            <div className="fixed bottom-6 right-6 z-10">
                <button
                    onClick={() => {
                        setIsAddDialogOpen(true)
                    }}
                    className="rounded-full bg-primary text-background hover:bg-primary/80 w-14 h-14 flex items-center justify-center cursor-pointer shadow-lg transition-all duration-200"
                    title="Add new raid session"
                >
                    <PlusIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Add Session Dialog */}
            <RaidSessionDialog isOpen={isAddDialogOpen} setOpen={setIsAddDialogOpen} />
        </div>
    )
}

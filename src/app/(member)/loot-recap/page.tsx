"use client"

import { Calendar, Package, Search, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { EmptyState } from "@/components/ui/empty-state"
import { GlassCard } from "@/components/ui/glass-card"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { StatBadge } from "@/components/ui/stat-badge"
import { useRaidSessionsForRecap } from "@/lib/queries/loot-recap"
import { formatUnixTimestampForDisplay } from "@/shared/libs/date-utils"
import { s } from "@/shared/libs/string-utils"

export default function LootRecapListPage() {
    const [searchQuery, setSearchQuery] = useState("")
    const router = useRouter()
    const { data: sessions, isLoading } = useRaidSessionsForRecap()

    const filteredSessions = useMemo(() => {
        if (!sessions) {
            return []
        }
        if (!searchQuery.trim()) {
            return sessions
        }

        const query = searchQuery.toLowerCase()
        return sessions.filter((session) => session.name.toLowerCase().includes(query))
    }, [sessions, searchQuery])

    if (isLoading) {
        return <LoadingSpinner size="lg" text="Loading raid sessions..." />
    }

    return (
        <div className="w-full min-h-screen flex flex-col gap-y-6 p-6 md:p-8">
            {/* Header */}
            <GlassCard padding="lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Loot Recap</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            View loot distribution for past raid sessions
                        </p>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Search sessions..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                            }}
                            className="pl-10"
                        />
                    </div>
                </div>
            </GlassCard>

            {/* Session Grid */}
            {filteredSessions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSessions.map((session) => (
                        <GlassCard
                            key={session.id}
                            interactive
                            padding="lg"
                            className="group"
                            onClick={() => {
                                router.push(`/loot-recap/${session.id}`)
                            }}
                        >
                            <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                                {session.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                <Calendar className="h-4 w-4" />
                                <span>
                                    {formatUnixTimestampForDisplay(session.raidDate)}
                                </span>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <StatBadge
                                    variant="info"
                                    icon={<Package className="h-3 w-3" />}
                                    label="Loot"
                                    value={s(session.lootCount)}
                                />
                                <StatBadge
                                    variant="default"
                                    icon={<Users className="h-3 w-3" />}
                                    label="Roster"
                                    value={s(session.rosterCount)}
                                />
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {filteredSessions.length === 0 && (
                <EmptyState
                    icon={<Package className="w-8 h-8" />}
                    title="No sessions found"
                    description={
                        searchQuery
                            ? `No sessions matching "${searchQuery}"`
                            : "No raid sessions available yet"
                    }
                />
            )}
        </div>
    )
}

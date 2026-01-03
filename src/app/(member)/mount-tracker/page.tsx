"use client"

import { Check, Compass, X } from "lucide-react"
import { useMemo, type JSX } from "react"
import { EmptyState } from "@/components/ui/empty-state"
import { GlassCard } from "@/components/ui/glass-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { StatBadge } from "@/components/ui/stat-badge"
import { WowClassIcon } from "@/components/wow/wow-class-icon"
import { useMountTracker } from "@/lib/queries/mount-tracker"
import { cn } from "@/lib/utils"
import { formatUnixTimestampForDisplay } from "@/shared/libs/date-utils"
import { s } from "@/shared/libs/string-utils"

export default function MountTrackerPage(): JSX.Element {
    const { data: statuses, isLoading } = useMountTracker()

    // Split into two groups: missing and owned, both alphabetically sorted
    const { missing, owned } = useMemo(() => {
        if (!statuses) {
            return { missing: [], owned: [] }
        }
        const missing = statuses
            .filter((s) => !s.hasMount)
            .sort((a, b) => a.playerName.localeCompare(b.playerName))
        const owned = statuses
            .filter((s) => s.hasMount)
            .sort((a, b) => a.playerName.localeCompare(b.playerName))
        return { missing, owned }
    }, [statuses])

    const ownedCount = statuses?.filter((status) => status.hasMount).length ?? 0
    const totalCount = statuses?.length ?? 0
    const progressPercent =
        totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0

    return (
        <div className="w-full min-h-screen flex flex-col gap-6 p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Compass className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Mount Tracker</h1>
                    <p className="text-sm text-muted-foreground">
                        Track guild mount acquisition progress
                    </p>
                </div>
            </div>

            {/* Stats */}
            {!isLoading && statuses && (
                <div className="flex flex-wrap gap-3">
                    <StatBadge
                        variant="success"
                        icon={<Check className="w-4 h-4" />}
                        label="Have Mount"
                        value={s(ownedCount)}
                    />
                    <StatBadge
                        variant="warning"
                        icon={<X className="w-4 h-4" />}
                        label="Missing Mount"
                        value={s(totalCount - ownedCount)}
                    />
                    <StatBadge
                        variant="info"
                        label="Progress"
                        value={`${s(progressPercent)}%`}
                    />
                </div>
            )}

            {/* Loading */}
            {isLoading && <LoadingSpinner size="lg" text="Loading mount status..." />}

            {/* Player List */}
            {!isLoading && (missing.length > 0 || owned.length > 0) && (
                <GlassCard padding="none" className="overflow-hidden">
                    {/* Missing Mount Group */}
                    {missing.length > 0 && (
                        <>
                            <div className="px-4 py-2 bg-orange-500/10 border-b border-orange-500/30">
                                <span className="text-xs font-medium uppercase tracking-wider text-orange-400">
                                    Missing Mount ({missing.length})
                                </span>
                            </div>
                            <div className="divide-y divide-border/50">
                                {missing.map((status) => (
                                    <div
                                        key={status.playerId}
                                        className="flex items-center gap-4 p-4 bg-orange-500/5"
                                    >
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-orange-500/20">
                                            <X className="w-5 h-5 text-orange-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">
                                                {status.playerName}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <WowClassIcon
                                                    wowClassName={status.characterClass}
                                                    showTooltip={false}
                                                    className="w-4 h-4"
                                                />
                                                <span className="truncate">
                                                    {status.characterName}-
                                                    {status.characterRealm}
                                                </span>
                                            </div>
                                        </div>
                                        {status.lastLoginAt && (
                                            <div className="text-xs text-muted-foreground/60 hidden md:block">
                                                {formatUnixTimestampForDisplay(
                                                    status.lastLoginAt
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Has Mount Group */}
                    {owned.length > 0 && (
                        <>
                            <div
                                className={cn(
                                    "px-4 py-2 bg-green-500/10 border-b border-green-500/30",
                                    missing.length > 0 && "border-t-4 border-t-border"
                                )}
                            >
                                <span className="text-xs font-medium uppercase tracking-wider text-green-400">
                                    Has Mount ({owned.length})
                                </span>
                            </div>
                            <div className="divide-y divide-border/50">
                                {owned.map((status) => (
                                    <div
                                        key={status.playerId}
                                        className="flex items-center gap-4 p-4 bg-green-500/5"
                                    >
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-green-500/20">
                                            <Check className="w-5 h-5 text-green-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">
                                                {status.playerName}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <WowClassIcon
                                                    wowClassName={status.characterClass}
                                                    showTooltip={false}
                                                    className="w-4 h-4"
                                                />
                                                <span className="truncate">
                                                    {status.characterName}-
                                                    {status.characterRealm}
                                                </span>
                                            </div>
                                        </div>
                                        {status.lastLoginAt && (
                                            <div className="text-xs text-muted-foreground/60 hidden md:block">
                                                {formatUnixTimestampForDisplay(
                                                    status.lastLoginAt
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </GlassCard>
            )}

            {/* Empty State */}
            {!isLoading && missing.length === 0 && owned.length === 0 && (
                <EmptyState
                    icon={<Compass className="w-8 h-8" />}
                    title="No players found"
                    description="Add players to the roster to track their mount progress"
                />
            )}
        </div>
    )
}

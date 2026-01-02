"use client"

import { ArrowLeft, Calendar, Package, TrendingUp, Zap } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { EmptyState } from "@/components/ui/empty-state"
import { GlassCard } from "@/components/ui/glass-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { StatBadge } from "@/components/ui/stat-badge"
import { WowClassIcon } from "@/components/wow/wow-class-icon"
import { WowGearIcon } from "@/components/wow/wow-gear-icon"
import { useLootRecap } from "@/lib/queries/loot-recap"
import { formatUnixTimestampForDisplay } from "@/shared/libs/date-utils"
import { s } from "@/shared/libs/string-utils"

export default function LootRecapDetailPage() {
    const params = useParams<{ sessionId: string }>()
    const router = useRouter()
    const { data, isLoading } = useLootRecap(params.sessionId)

    if (isLoading) {
        return <LoadingSpinner size="lg" text="Loading loot recap..." />
    }

    if (!data) {
        return (
            <div className="p-8">
                <EmptyState
                    icon={<Package className="w-8 h-8" />}
                    title="Session not found"
                    description="This raid session doesn't exist or has been deleted"
                />
            </div>
        )
    }

    const { session, recapByCharacter, totalStats } = data

    return (
        <div className="w-full min-h-screen flex flex-col gap-y-6 p-6 md:p-8">
            {/* Header */}
            <GlassCard padding="lg">
                <div className="flex flex-col gap-4">
                    {/* Back button and title */}
                    <div className="flex items-start gap-4">
                        <button
                            onClick={() => {
                                router.push("/loot-recap")
                            }}
                            className="p-2 rounded-xl bg-card/50 hover:bg-card transition-colors shrink-0"
                            aria-label="Back to sessions"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold truncate">
                                {session.name}
                            </h1>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <Calendar className="h-4 w-4 shrink-0" />
                                <span>
                                    {formatUnixTimestampForDisplay(session.raidDate)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="flex gap-3 flex-wrap">
                        <StatBadge
                            variant="info"
                            icon={<Package className="h-3 w-3" />}
                            label="Total Items"
                            value={s(totalStats.itemCount)}
                        />
                        {totalStats.totalDpsGain > 0 && (
                            <StatBadge
                                variant="success"
                                icon={<TrendingUp className="h-3 w-3" />}
                                label="Total DPS Gain"
                                value={`+${s(Math.round(totalStats.totalDpsGain))}`}
                            />
                        )}
                        {totalStats.twoPieceCount > 0 && (
                            <StatBadge
                                variant="primary"
                                icon={<Zap className="h-3 w-3" />}
                                label="2pc Completed"
                                value={s(totalStats.twoPieceCount)}
                            />
                        )}
                        {totalStats.fourPieceCount > 0 && (
                            <StatBadge
                                variant="primary"
                                icon={<Zap className="h-3 w-3" />}
                                label="4pc Completed"
                                value={s(totalStats.fourPieceCount)}
                            />
                        )}
                    </div>
                </div>
            </GlassCard>

            {/* Per-Character Breakdown */}
            {recapByCharacter.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {recapByCharacter.map((charRecap) => (
                        <GlassCard key={charRecap.character.id} padding="lg">
                            {/* Character Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <WowClassIcon
                                        wowClassName={charRecap.character.class}
                                        className="h-10 w-10 rounded-lg shrink-0"
                                        size={40}
                                    />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold truncate">
                                                {charRecap.character.name}
                                            </h3>
                                            {charRecap.character.main && (
                                                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded shrink-0">
                                                    Main
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {s(charRecap.items.length)} item
                                            {charRecap.items.length !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    {charRecap.stats.totalDpsGain > 0 && (
                                        <p className="text-sm font-medium text-green-400">
                                            +{s(Math.round(charRecap.stats.totalDpsGain))}{" "}
                                            DPS
                                        </p>
                                    )}
                                    {(charRecap.stats.tierSetProgress.twoPieceCompleted ||
                                        charRecap.stats.tierSetProgress
                                            .fourPieceCompleted) && (
                                        <p className="text-xs text-purple-400">
                                            {charRecap.stats.tierSetProgress
                                                .fourPieceCompleted
                                                ? "4pc Completed"
                                                : "2pc Completed"}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="space-y-2">
                                {charRecap.items.map(({ loot, bossName }) => (
                                    <div
                                        key={loot.id}
                                        className="flex items-center gap-3 p-3 bg-card/30 rounded-xl"
                                    >
                                        <WowGearIcon
                                            gearItem={loot.gearItem}
                                            showExtendedInfo
                                            showTiersetRibbon
                                        />
                                        <div className="flex-1" />
                                        <div className="flex flex-col items-end shrink-0 text-right">
                                            <span className="text-xs text-muted-foreground truncate max-w-32">
                                                {bossName}
                                            </span>
                                            {loot.assignedHighlights?.dpsGain !==
                                                undefined &&
                                                loot.assignedHighlights.dpsGain > 0 && (
                                                    <span className="text-xs font-medium text-green-400">
                                                        +
                                                        {s(
                                                            Math.round(
                                                                loot.assignedHighlights
                                                                    .dpsGain
                                                            )
                                                        )}{" "}
                                                        DPS
                                                    </span>
                                                )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={<Package className="w-8 h-8" />}
                    title="No loot assigned"
                    description="No items have been assigned in this session yet"
                />
            )}
        </div>
    )
}

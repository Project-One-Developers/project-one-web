"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
    CheckCircle2,
    Clock,
    CloudDownload,
    Database,
    Loader2,
    MessageSquare,
    Play,
    Shield,
    Users,
    XCircle,
} from "lucide-react"
import { DateTime } from "luxon"
import { useState, type JSX, type ReactNode } from "react"
import { toast } from "sonner"
import { importGuildMembers, syncAllCharactersBlizzard } from "@/actions/blizzard"
import { syncDroptimizersFromDiscord } from "@/actions/droptimizer"
import { syncFromRaidbots } from "@/actions/items"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"
import { unwrap } from "@/lib/errors"
import { useCronLogs } from "@/lib/queries/cron-logs"
import { queryKeys } from "@/lib/queries/keys"
import { s } from "@/shared/libs/string-utils"
import { syncAllResultsSchema, type CronLog } from "@/shared/models/cron-log.models"

type SyncActionCardProps = {
    icon: ReactNode
    title: string
    description: string
    isLoading: boolean
    onSync: () => void
}

function SyncActionCard({
    icon,
    title,
    description,
    isLoading,
    onSync,
}: SyncActionCardProps) {
    return (
        <GlassCard
            padding="lg"
            className="flex items-start gap-4 hover:border-primary/30 transition-colors"
        >
            <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                {icon}
            </div>
            <div className="grow min-w-0">
                <h3 className="font-medium text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            </div>
            <Button
                variant="secondary"
                size="sm"
                onClick={onSync}
                disabled={isLoading}
                className="shrink-0"
            >
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Play className="h-4 w-4" />
                )}
            </Button>
        </GlassCard>
    )
}

function formatCronResults(log: CronLog): string {
    if (log.status === "failed") {
        return log.errorMessage ?? "Unknown error"
    }

    const parsed = syncAllResultsSchema.safeParse(log.results)
    if (!parsed.success) {
        return "Completed"
    }

    const { imported, skipped } = parsed.data.discord
    return `${s(imported)} imported, ${s(skipped)} skipped`
}

function CronHistoryRow({ log }: { log: CronLog }) {
    const isSuccess = log.status === "success"

    return (
        <div className="flex items-center gap-3 py-2">
            {isSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <span className="text-sm text-muted-foreground w-20 shrink-0">
                {DateTime.fromJSDate(log.startedAt).toRelative()}
            </span>
            <span
                className={`text-sm truncate ${isSuccess ? "text-foreground" : "text-red-400"}`}
            >
                {formatCronResults(log)}
            </span>
            <span className="text-xs text-muted-foreground/60 ml-auto shrink-0">
                {(log.durationMs / 1000).toFixed(1)}s
            </span>
        </div>
    )
}

export default function SyncPage(): JSX.Element {
    const queryClient = useQueryClient()
    const { data: cronLogs } = useCronLogs(3)
    const [isSyncingBlizzard, setIsSyncingBlizzard] = useState(false)
    const [isSyncingDiscord, setIsSyncingDiscord] = useState(false)
    const [isSyncingItems, setIsSyncingItems] = useState(false)
    const [isImportingGuild, setIsImportingGuild] = useState(false)

    const handleSyncBlizzard = async () => {
        setIsSyncingBlizzard(true)
        try {
            const result = await unwrap(syncAllCharactersBlizzard())
            toast.success(
                `Blizzard sync completed: ${s(result.synced)} characters synced`
            )
            if (result.errors.length > 0) {
                toast.warning(`${s(result.errors.length)} errors occurred during sync`)
            }
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: [queryKeys.raidProgression] }),
                queryClient.invalidateQueries({
                    queryKey: [queryKeys.characterGameInfo],
                }),
                queryClient.invalidateQueries({ queryKey: [queryKeys.rosterSummary] }),
                queryClient.invalidateQueries({ queryKey: [queryKeys.mountTracker] }),
            ])
        } catch (error) {
            toast.error(`Blizzard sync failed: ${s(error)}`)
        } finally {
            setIsSyncingBlizzard(false)
        }
    }

    const handleSyncDiscord = async () => {
        setIsSyncingDiscord(true)
        try {
            const result = await unwrap(syncDroptimizersFromDiscord({ days: 7 }))
            toast.success(
                `Discord sync completed: ${s(result.imported)} imported, ${s(result.skipped)} skipped`
            )
            if (result.errors.length > 0) {
                toast.warning(`${s(result.errors.length)} errors occurred during import`)
            }
            await queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        } catch (error) {
            toast.error(`Discord sync failed: ${s(error)}`)
        } finally {
            setIsSyncingDiscord(false)
        }
    }

    const handleSyncItems = async () => {
        setIsSyncingItems(true)
        try {
            const result = await unwrap(syncFromRaidbots({ skipWowhead: false }))
            const totalCount =
                result.bosses.count +
                result.items.count +
                result.itemsToTierset.count +
                result.itemsToCatalyst.count +
                result.bonusItemTracks.count
            toast.success(`Items sync completed: ${s(totalCount)} records synced`)
            const hasErrors =
                result.bosses.error ??
                result.items.error ??
                result.itemsToTierset.error ??
                result.itemsToCatalyst.error ??
                result.bonusItemTracks.error
            if (hasErrors) {
                toast.warning("Some errors occurred during sync, check logs")
            }
        } catch (error) {
            toast.error(`Items sync failed: ${s(error)}`)
        } finally {
            setIsSyncingItems(false)
        }
    }

    const handleImportGuild = async () => {
        setIsImportingGuild(true)
        try {
            const result = await unwrap(importGuildMembers())
            toast.success(
                `Guild import completed: ${s(result.imported)} imported, ${s(result.skipped)} skipped`
            )
            if (result.errors.length > 0) {
                toast.warning(`${s(result.errors.length)} errors occurred during import`)
            }
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: [queryKeys.playersWithCharacters],
                }),
                queryClient.invalidateQueries({
                    queryKey: [queryKeys.playersWithoutCharacters],
                }),
                queryClient.invalidateQueries({ queryKey: [queryKeys.characters] }),
                queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] }),
                queryClient.invalidateQueries({ queryKey: [queryKeys.rosterSummary] }),
            ])
        } catch (error) {
            toast.error(`Guild import failed: ${s(error)}`)
        } finally {
            setIsImportingGuild(false)
        }
    }

    return (
        <div className="w-full min-h-screen p-8 flex flex-col gap-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <CloudDownload className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Sync</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage sync operations and data imports
                    </p>
                </div>
            </div>

            {/* Sync Actions Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                <SyncActionCard
                    icon={<Users className="w-5 h-5" />}
                    title="Guild Members"
                    description="Import new members from the guild roster"
                    isLoading={isImportingGuild}
                    onSync={() => void handleImportGuild()}
                />

                <SyncActionCard
                    icon={<Shield className="w-5 h-5" />}
                    title="Blizzard API"
                    description="Sync character profiles, gear, and progression data"
                    isLoading={isSyncingBlizzard}
                    onSync={() => void handleSyncBlizzard()}
                />

                <SyncActionCard
                    icon={<Database className="w-5 h-5" />}
                    title="Items Database"
                    description="Update boss loot tables and item metadata"
                    isLoading={isSyncingItems}
                    onSync={() => void handleSyncItems()}
                />

                <SyncActionCard
                    icon={<MessageSquare className="w-5 h-5" />}
                    title="Discord Droptimizers"
                    description="Import droptimizer reports from Discord (last 7 days)"
                    isLoading={isSyncingDiscord}
                    onSync={() => void handleSyncDiscord()}
                />
            </div>

            {/* Scheduled Sync History */}
            <GlassCard padding="lg">
                <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Scheduled Sync History
                    </h3>
                </div>
                {cronLogs && cronLogs.length > 0 ? (
                    <div className="divide-y divide-border/40">
                        {cronLogs.map((log) => (
                            <CronHistoryRow key={log.id} log={log} />
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground/60">
                        No scheduled sync history yet. Cron jobs run daily at 6 PM UTC.
                    </p>
                )}
            </GlassCard>
        </div>
    )
}

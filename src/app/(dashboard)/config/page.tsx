"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
    Clock,
    Database,
    Loader2,
    MessageSquare,
    Play,
    Settings,
    Shield,
    Users,
} from "lucide-react"
import { useState, type JSX, type ReactNode } from "react"
import { toast } from "sonner"
import { importGuildMembers, syncAllCharactersBlizzard } from "@/actions/blizzard"
import { syncDroptimizersFromDiscord } from "@/actions/droptimizer"
import { syncItemsFromJson } from "@/actions/items"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"
import { queryKeys } from "@/lib/queries/keys"
import { s } from "@/lib/safe-stringify"

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
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                {icon}
            </div>
            <div className="flex-grow min-w-0">
                <h3 className="font-medium text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            </div>
            <Button
                variant="secondary"
                size="sm"
                onClick={onSync}
                disabled={isLoading}
                className="flex-shrink-0"
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

export default function SettingsPage(): JSX.Element {
    const queryClient = useQueryClient()
    const [isSyncingBlizzard, setIsSyncingBlizzard] = useState(false)
    const [isSyncingDiscord, setIsSyncingDiscord] = useState(false)
    const [isSyncingItems, setIsSyncingItems] = useState(false)
    const [isImportingGuild, setIsImportingGuild] = useState(false)

    const handleSyncBlizzard = async () => {
        setIsSyncingBlizzard(true)
        try {
            const result = await syncAllCharactersBlizzard()
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
            const result = await syncDroptimizersFromDiscord({ days: 7 })
            toast.success(
                `Discord sync completed: ${s(result.imported)} droptimizers imported`
            )
            if (result.errors.length > 0) {
                toast.warning(`${s(result.errors.length)} errors occurred during import`)
            }
        } catch (error) {
            toast.error(`Discord sync failed: ${s(error)}`)
        } finally {
            setIsSyncingDiscord(false)
        }
    }

    const handleSyncItems = async () => {
        setIsSyncingItems(true)
        try {
            const result = await syncItemsFromJson()
            const totalCount =
                result.bosses.count +
                result.items.count +
                result.itemsToTierset.count +
                result.itemsToCatalyst.count
            toast.success(`Items sync completed: ${s(totalCount)} records synced`)
            if (
                result.bosses.error ??
                result.items.error ??
                result.itemsToTierset.error ??
                result.itemsToCatalyst.error
            ) {
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
            const result = await importGuildMembers()
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
                    <Settings className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage sync operations and data imports
                    </p>
                </div>
            </div>

            {/* Sync Actions Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                <SyncActionCard
                    icon={<Shield className="w-5 h-5" />}
                    title="Blizzard API"
                    description="Sync character profiles, gear, and progression data"
                    isLoading={isSyncingBlizzard}
                    onSync={() => void handleSyncBlizzard()}
                />

                <SyncActionCard
                    icon={<MessageSquare className="w-5 h-5" />}
                    title="Discord Droptimizers"
                    description="Import droptimizer reports from Discord (last 7 days)"
                    isLoading={isSyncingDiscord}
                    onSync={() => void handleSyncDiscord()}
                />

                <SyncActionCard
                    icon={<Database className="w-5 h-5" />}
                    title="Items Database"
                    description="Update boss loot tables and item metadata"
                    isLoading={isSyncingItems}
                    onSync={() => void handleSyncItems()}
                />

                <SyncActionCard
                    icon={<Users className="w-5 h-5" />}
                    title="Guild Members"
                    description="Import new members from the guild roster"
                    isLoading={isImportingGuild}
                    onSync={() => void handleImportGuild()}
                />
            </div>

            {/* Info Footer */}
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                    These sync tasks also run automatically via scheduled jobs every few
                    hours. Use manual sync when you need immediate updates.
                </p>
            </div>
        </div>
    )
}

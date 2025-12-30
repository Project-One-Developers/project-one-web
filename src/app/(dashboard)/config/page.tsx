"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
    Database,
    Loader2,
    MessageSquare,
    RefreshCcwDot,
    Shield,
    Users,
} from "lucide-react"
import { Duration } from "luxon"
import { useState, type JSX } from "react"
import { toast } from "sonner"
import { importGuildMembers, syncAllCharactersBlizzard } from "@/actions/blizzard"
import { syncDroptimizersFromDiscord } from "@/actions/droptimizer"
import { syncItemsFromJson } from "@/actions/items"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"
import { SectionHeader } from "@/components/ui/section-header"
import { queryKeys } from "@/lib/queries/keys"
import { s } from "@/lib/safe-stringify"

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
            // Invalidate caches that depend on Blizzard data
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
            const result = await syncDroptimizersFromDiscord(
                Duration.fromObject({ days: 7 })
            )
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
            // Invalidate roster-related caches
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
        <div className="w-full min-h-screen p-8 flex flex-col gap-6">
            <GlassCard padding="lg">
                <h1 className="text-2xl font-bold">Settings</h1>
            </GlassCard>

            {/* Sync Actions */}
            <GlassCard padding="lg" className="space-y-4">
                <SectionHeader icon={<RefreshCcwDot className="w-4 h-4" />}>
                    Sync Actions
                </SectionHeader>
                <div className="grid gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => void handleSyncBlizzard()}
                        disabled={isSyncingBlizzard}
                        className="justify-start"
                    >
                        {isSyncingBlizzard ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Shield className="mr-2 h-4 w-4" />
                        )}
                        Sync Blizzard API
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => void handleSyncDiscord()}
                        disabled={isSyncingDiscord}
                        className="justify-start"
                    >
                        {isSyncingDiscord ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <MessageSquare className="mr-2 h-4 w-4" />
                        )}
                        Sync Droptimizers from Discord
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => void handleSyncItems()}
                        disabled={isSyncingItems}
                        className="justify-start"
                    >
                        {isSyncingItems ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Database className="mr-2 h-4 w-4" />
                        )}
                        Sync Items Data
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => void handleImportGuild()}
                        disabled={isImportingGuild}
                        className="justify-start"
                    >
                        {isImportingGuild ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Users className="mr-2 h-4 w-4" />
                        )}
                        Import Guild Members
                    </Button>
                </div>
            </GlassCard>

            {/* Info */}
            <GlassCard variant="subtle" padding="lg">
                <p className="text-sm text-muted-foreground">
                    Sync tasks also run automatically via cron jobs every few hours. Use
                    the buttons above to trigger a manual sync when needed.
                </p>
            </GlassCard>
        </div>
    )
}

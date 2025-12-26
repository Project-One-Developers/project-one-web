"use client"

import {
    Database,
    ListRestart,
    Loader2,
    MessageSquare,
    RefreshCcwDot,
} from "lucide-react"
import { toast } from "sonner"

import { useState, type JSX } from "react"

import { syncDroptimizersFromDiscordAction } from "@/actions/droptimizer"
import { syncAllCharactersRaiderioAction } from "@/actions/raiderio"
import { syncCharacterWowAuditAction } from "@/actions/wowaudit"
import { Button } from "@/components/ui/button"
import { s } from "@/lib/safe-stringify"

export default function SettingsPage(): JSX.Element {
    const [isSyncingWowAudit, setIsSyncingWowAudit] = useState(false)
    const [isSyncingRaiderio, setIsSyncingRaiderio] = useState(false)
    const [isSyncingDiscord, setIsSyncingDiscord] = useState(false)

    const handleSyncWowAudit = async () => {
        setIsSyncingWowAudit(true)
        try {
            await syncCharacterWowAuditAction()
            toast.success("WowAudit sync completed successfully")
        } catch (error) {
            toast.error(
                `WowAudit sync failed: ${error instanceof Error ? error.message : "Unknown error"}`
            )
        } finally {
            setIsSyncingWowAudit(false)
        }
    }

    const handleSyncRaiderio = async () => {
        setIsSyncingRaiderio(true)
        try {
            const result = await syncAllCharactersRaiderioAction()
            toast.success(
                `Raider.io sync completed: ${s(result.synced)} characters synced`
            )
            if (result.errors.length > 0) {
                toast.warning(`${s(result.errors.length)} errors occurred during sync`)
            }
        } catch (error) {
            toast.error(
                `Raider.io sync failed: ${error instanceof Error ? error.message : "Unknown error"}`
            )
        } finally {
            setIsSyncingRaiderio(false)
        }
    }

    const handleSyncDiscord = async () => {
        setIsSyncingDiscord(true)
        try {
            const result = await syncDroptimizersFromDiscordAction(168) // Last 7 days
            toast.success(
                `Discord sync completed: ${s(result.imported)} droptimizers imported`
            )
            if (result.errors.length > 0) {
                toast.warning(`${s(result.errors.length)} errors occurred during import`)
            }
        } catch (error) {
            toast.error(
                `Discord sync failed: ${error instanceof Error ? error.message : "Unknown error"}`
            )
        } finally {
            setIsSyncingDiscord(false)
        }
    }

    return (
        <div className="w-full min-h-screen p-8 flex flex-col gap-6">
            <h1 className="text-3xl font-bold">Settings</h1>

            {/* Database Configuration */}
            <section className="bg-muted p-6 rounded-lg space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database Configuration
                </h2>
                <p className="text-sm text-muted-foreground">
                    Database is configured via environment variables in the web version.
                </p>
            </section>

            {/* Sync Actions */}
            <section className="bg-muted p-6 rounded-lg space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <RefreshCcwDot className="h-5 w-5" />
                    Sync Actions
                </h2>
                <div className="grid gap-4">
                    <Button
                        variant="secondary"
                        onClick={() => void handleSyncWowAudit()}
                        disabled={isSyncingWowAudit}
                    >
                        {isSyncingWowAudit ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <ListRestart className="mr-2 h-4 w-4" />
                        )}
                        Sync WowAudit
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => void handleSyncRaiderio()}
                        disabled={isSyncingRaiderio}
                    >
                        {isSyncingRaiderio ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <ListRestart className="mr-2 h-4 w-4" />
                        )}
                        Sync Raider.io
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => void handleSyncDiscord()}
                        disabled={isSyncingDiscord}
                    >
                        {isSyncingDiscord ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <MessageSquare className="mr-2 h-4 w-4" />
                        )}
                        Sync Droptimizers from Discord
                    </Button>
                </div>
            </section>

            {/* Info */}
            <section className="bg-muted/50 p-6 rounded-lg">
                <p className="text-sm text-muted-foreground">
                    Sync tasks also run automatically via cron jobs every few hours. Use
                    the buttons above to trigger a manual sync when needed.
                </p>
            </section>
        </div>
    )
}

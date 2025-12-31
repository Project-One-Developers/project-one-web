import { NextResponse } from "next/server"
import {
    syncDroptimizersFromDiscordInternal,
    deleteSimulationsOlderThanInternal,
} from "@/actions/droptimizer"
import { env } from "@/env"
import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"

// Verify this is a cron request from Vercel
function verifyCronSecret(request: Request): boolean {
    if (!env.CRON_SECRET) {
        return false
    } // No secret configured, block
    const authHeader = request.headers.get("authorization")
    return authHeader === `Bearer ${env.CRON_SECRET}`
}

export async function GET(request: Request) {
    if (!verifyCronSecret(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        logger.info("Cron", `Full sync started at ${new Date().toISOString()}`)

        const results = {
            discord: { success: false, imported: 0, errors: [] as string[] },
            cleanup: { success: false, error: null as string | null },
        }

        // Discord droptimizer sync
        try {
            const discordResult = await syncDroptimizersFromDiscordInternal({ days: 2 })
            results.discord.success = true
            results.discord.imported = discordResult.imported
            results.discord.errors = discordResult.errors
        } catch (error) {
            results.discord.success = false
            results.discord.errors = [
                error instanceof Error ? error.message : "Unknown error",
            ]
        }

        // Cleanup old simulations
        try {
            await deleteSimulationsOlderThanInternal({ days: 7 })
            results.cleanup.success = true
        } catch (error) {
            results.cleanup.error =
                error instanceof Error ? error.message : "Unknown error"
        }

        logger.info("Cron", `Full sync completed: ${s(results)}`)

        return NextResponse.json({
            success: true,
            message: "Full sync completed",
            results,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        logger.error("Cron", `Full sync failed: ${s(error)}`)
        return NextResponse.json(
            {
                error: "Sync failed",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        )
    }
}

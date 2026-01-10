import { NextResponse } from "next/server"
import {
    syncDroptimizersFromDiscord,
    deleteSimulationsOlderThan,
} from "@/actions/droptimizer"
import { cronLogRepo } from "@/db/repositories/cron-log.repo"
import { env } from "@/env"
import { logger } from "@/lib/logger"
import { s } from "@/shared/libs/string-utils"

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

    const startedAt = new Date()

    try {
        logger.info("Cron", `Full sync started at ${startedAt.toISOString()}`)

        const results = {
            discord: { success: false, imported: 0, skipped: 0, errors: [] as string[] },
            cleanup: { success: false, error: null as string | null },
        }

        // Discord droptimizer sync
        try {
            const discordResult = await syncDroptimizersFromDiscord({ days: 2 })
            results.discord.success = true
            results.discord.imported = discordResult.imported
            results.discord.skipped = discordResult.skipped
            results.discord.errors = discordResult.errors
        } catch (error) {
            results.discord.success = false
            results.discord.errors = [
                error instanceof Error ? error.message : "Unknown error",
            ]
        }

        // Cleanup old simulations
        try {
            await deleteSimulationsOlderThan({ days: 7 })
            results.cleanup.success = true
        } catch (error) {
            results.cleanup.error =
                error instanceof Error ? error.message : "Unknown error"
        }

        const completedAt = new Date()
        const durationMs = completedAt.getTime() - startedAt.getTime()

        // Log to database
        await cronLogRepo.add({
            jobName: "sync-all",
            status: "success",
            results,
            errorMessage: null,
            startedAt,
            completedAt,
            durationMs,
        })

        logger.info("Cron", `Full sync completed: ${s(results)}`)

        return NextResponse.json({
            success: true,
            message: "Full sync completed",
            results,
            timestamp: completedAt.toISOString(),
        })
    } catch (error) {
        const completedAt = new Date()
        const durationMs = completedAt.getTime() - startedAt.getTime()
        const errorMessage = error instanceof Error ? error.message : "Unknown error"

        // Log failure to database
        await cronLogRepo.add({
            jobName: "sync-all",
            status: "failed",
            results: null,
            errorMessage,
            startedAt,
            completedAt,
            durationMs,
        })

        logger.error("Cron", `Full sync failed: ${s(error)}`)
        return NextResponse.json(
            {
                error: "Sync failed",
                message: errorMessage,
            },
            { status: 500 }
        )
    }
}

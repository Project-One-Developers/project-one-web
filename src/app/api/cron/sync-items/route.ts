import { NextResponse } from "next/server"
import { syncFromRaidbots } from "@/actions/items"
import { env } from "@/env"
import { unwrap } from "@/lib/errors"
import { logger } from "@/lib/logger"
import { s } from "@/shared/libs/string-utils"

// Verify this is a cron request from Vercel or local dev
function verifyCronSecret(request: Request): boolean {
    // Allow in development
    if (process.env.NODE_ENV === "development") {
        return true
    }
    if (!env.CRON_SECRET) {
        return false
    }
    const authHeader = request.headers.get("authorization")
    return authHeader === `Bearer ${env.CRON_SECRET}`
}

export async function GET(request: Request) {
    if (!verifyCronSecret(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        logger.info("SyncItems", `Items sync started at ${new Date().toISOString()}`)

        // Call the action and unwrap the result
        const results = await unwrap(syncFromRaidbots({ skipWowhead: false }))

        logger.info("SyncItems", `Items sync completed: ${s(results)}`)

        return NextResponse.json({
            success: true,
            message: "Items sync completed",
            results,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        logger.error("SyncItems", `Items sync failed: ${s(error)}`)
        return NextResponse.json(
            {
                error: "Sync failed",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        )
    }
}

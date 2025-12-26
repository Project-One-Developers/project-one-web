import { checkRaiderioUpdatesAction } from "@/actions/raiderio"
import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"
import { NextResponse } from "next/server"

// Verify this is a cron request from Vercel (optional but recommended)
function verifyCronSecret(request: Request): boolean {
    const authHeader = request.headers.get("authorization")
    if (!process.env.CRON_SECRET) {
        return true
    } // No secret configured, allow
    return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(request: Request) {
    if (!verifyCronSecret(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        logger.info("Cron", `Raider.io sync started at ${new Date().toISOString()}`)

        const result = await checkRaiderioUpdatesAction()

        logger.info("Cron", `Raider.io sync completed: ${result.message}`)

        return NextResponse.json({
            success: true,
            ...result,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        logger.error("Cron", `Raider.io sync failed: ${s(error)}`)
        return NextResponse.json(
            {
                error: "Sync failed",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        )
    }
}

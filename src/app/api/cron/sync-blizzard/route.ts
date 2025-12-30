import { NextResponse } from "next/server"
import { checkBlizzardUpdates } from "@/actions/blizzard"
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
        logger.info("Cron", `Blizzard sync started at ${new Date().toISOString()}`)

        const result = await checkBlizzardUpdates()

        logger.info("Cron", `Blizzard sync completed: ${result.message}`)

        return NextResponse.json({
            success: true,
            ...result,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        logger.error("Cron", `Blizzard sync failed: ${s(error)}`)
        return NextResponse.json(
            {
                error: "Sync failed",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        )
    }
}

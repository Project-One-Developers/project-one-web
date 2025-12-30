import { z } from "zod"
import { env } from "@/env"
import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"

const bnetTokenResponseSchema = z.object({
    access_token: z.string(),
    token_type: z.string(),
    expires_in: z.number(),
})

const characterMediaResponseSchema = z.object({
    assets: z.array(
        z.object({
            key: z.string(),
            value: z.string(),
        })
    ),
})

// Cache token in memory (valid for ~24h, we refresh at 23h)
let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Get OAuth access token using client credentials flow
 */
async function getAccessToken(): Promise<string | null> {
    if (!env.BNET_CLIENT_ID || !env.BNET_CLIENT_SECRET) {
        return null
    }

    // Return cached token if still valid (with 5 min buffer)
    if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) {
        return cachedToken.token
    }

    try {
        const credentials = Buffer.from(
            `${env.BNET_CLIENT_ID}:${env.BNET_CLIENT_SECRET}`
        ).toString("base64")

        const response = await fetch("https://oauth.battle.net/token", {
            method: "POST",
            headers: {
                Authorization: `Basic ${credentials}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
        })

        if (!response.ok) {
            logger.error("Blizzard", `Failed to get access token: ${s(response.status)}`)
            return null
        }

        const data = bnetTokenResponseSchema.parse(await response.json())

        cachedToken = {
            token: data.access_token,
            expiresAt: Date.now() + data.expires_in * 1000,
        }

        return cachedToken.token
    } catch (error) {
        logger.error("Blizzard", `Error getting access token: ${s(error)}`)
        return null
    }
}

/**
 * Fetch character media (render URLs) from Blizzard API
 * Returns the main-raw URL (transparent full body render)
 */
export async function fetchCharacterMedia(
    name: string,
    realm: string,
    region = "eu"
): Promise<string | null> {
    const token = await getAccessToken()
    if (!token) {
        return null
    }

    try {
        const realmSlug = realm.toLowerCase().replace(/\s+/g, "-")
        const charName = name.toLowerCase()
        const namespace = `profile-${region}`

        const url = `https://${region}.api.blizzard.com/profile/wow/character/${realmSlug}/${encodeURIComponent(charName)}/character-media?namespace=${namespace}&locale=en_GB`

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        if (!response.ok) {
            if (response.status === 404) {
                logger.debug(
                    "Blizzard",
                    `Character media not found: ${s(name)}-${s(realm)}`
                )
            } else {
                logger.error(
                    "Blizzard",
                    `Failed to fetch character media: ${s(response.status)}`
                )
            }
            return null
        }

        const data = characterMediaResponseSchema.parse(await response.json())

        // Find main-raw asset (transparent full body render)
        const mainRaw = data.assets.find((a) => a.key === "main-raw")
        if (mainRaw) {
            return mainRaw.value
        }

        // Fallback to main if main-raw not available
        const main = data.assets.find((a) => a.key === "main")
        if (main) {
            return main.value
        }

        // Last fallback to inset
        const inset = data.assets.find((a) => a.key === "inset")
        return inset?.value ?? null
    } catch (error) {
        logger.error("Blizzard", `Error fetching character media: ${s(error)}`)
        return null
    }
}

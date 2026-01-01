import pLimit from "p-limit"
import "server-only"
import { z } from "zod"
import { env } from "@/env"
import { logger } from "@/lib/logger"
import { realmNameToSlug } from "@/shared/consts/wow.consts"
import { s } from "@/shared/libs/safe-stringify"
import type { WowItemEquippedSlotKey, WowRaidDifficulty } from "@/shared/models/wow.model"

// Rate limiting: Blizzard API allows ~36,000 requests/hour = 10/second
const blizzardRateLimit = pLimit(10)

// ============================================================================
// Response Schemas
// ============================================================================

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

// Character Profile Response
export const characterProfileResponseSchema = z.object({
    id: z.number(),
    name: z.string(),
    race: z.object({
        id: z.number(),
        name: z.string(),
    }),
    character_class: z.object({
        id: z.number(),
        name: z.string(),
    }),
    active_spec: z
        .object({
            id: z.number(),
            name: z.string(),
        })
        .optional(),
    average_item_level: z.number(),
    equipped_item_level: z.number(),
    last_login_timestamp: z.number(),
})
export type CharacterProfileResponse = z.infer<typeof characterProfileResponseSchema>

// Equipment Response
const equipmentSlotSchema = z.object({
    slot: z.object({
        type: z.string(),
        name: z.string(),
    }),
    item: z.object({
        id: z.number(),
        name: z.string().optional(),
    }),
    name: z.string().optional(),
    level: z.object({
        value: z.number(),
    }),
    quality: z.object({
        type: z.string(),
    }),
    bonus_list: z.array(z.number()).optional(),
    sockets: z
        .array(
            z.object({
                socket_type: z.object({ type: z.string() }),
                item: z.object({ id: z.number() }).optional(),
            })
        )
        .optional(),
    enchantments: z
        .array(
            z.object({
                enchantment_id: z.number(),
                display_string: z.string().optional(),
            })
        )
        .optional(),
})
export type EquipmentSlot = z.infer<typeof equipmentSlotSchema>

export const equipmentResponseSchema = z.object({
    equipped_items: z.array(equipmentSlotSchema),
})
export type EquipmentResponse = z.infer<typeof equipmentResponseSchema>

// Encounters (Raids) Response
const encounterSchema = z.object({
    encounter: z.object({
        id: z.number(),
        name: z.string(),
    }),
    completed_count: z.number(),
    last_kill_timestamp: z.number().optional(),
})

const modeSchema = z.object({
    difficulty: z.object({
        type: z.string(),
        name: z.string(),
    }),
    status: z.object({
        type: z.string(),
        name: z.string(),
    }),
    progress: z.object({
        completed_count: z.number(),
        total_count: z.number(),
        encounters: z.array(encounterSchema).optional(),
    }),
})

const instanceSchema = z.object({
    instance: z.object({
        id: z.number(),
        name: z.string(),
    }),
    modes: z.array(modeSchema),
})

const expansionSchema = z.object({
    expansion: z.object({
        id: z.number(),
        name: z.string(),
    }),
    instances: z.array(instanceSchema),
})

export const encountersRaidsResponseSchema = z.object({
    expansions: z.array(expansionSchema).optional(),
})
export type EncountersRaidsResponse = z.infer<typeof encountersRaidsResponseSchema>

// Guild Roster Response
const guildMemberSchema = z.object({
    character: z.object({
        name: z.string(),
        id: z.number(),
        realm: z.object({
            id: z.number(),
            slug: z.string(),
        }),
        level: z.number(),
        playable_class: z.object({
            id: z.number(),
        }),
    }),
    rank: z.number(),
})
export type GuildMember = z.infer<typeof guildMemberSchema>

export const guildRosterResponseSchema = z.object({
    guild: z.object({
        id: z.number(),
        name: z.string(),
        realm: z.object({
            id: z.number(),
            slug: z.string(),
        }),
    }),
    members: z.array(guildMemberSchema),
})
export type GuildRosterResponse = z.infer<typeof guildRosterResponseSchema>

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
        const realmSlug = realmNameToSlug(realm)
        const charName = name.toLowerCase()
        const namespace = `profile-${region}`

        const url = encodeURI(
            `https://${region}.api.blizzard.com/profile/wow/character/${realmSlug}/${charName}/character-media?namespace=${namespace}&locale=en_GB`
        )

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

// ============================================================================
// Character Profile API
// ============================================================================

/**
 * Fetch character profile (basic info, class, spec, item level)
 */
export async function fetchCharacterProfile(
    name: string,
    realm: string,
    region = "eu"
): Promise<CharacterProfileResponse | null> {
    return blizzardRateLimit(async () => {
        const token = await getAccessToken()
        if (!token) {
            return null
        }

        try {
            const realmSlug = realmNameToSlug(realm)
            const charName = name.toLowerCase()
            const namespace = `profile-${region}`

            const url = encodeURI(
                `https://${region}.api.blizzard.com/profile/wow/character/${realmSlug}/${charName}?namespace=${namespace}&locale=en_GB`
            )

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                if (response.status === 404) {
                    logger.debug(
                        "Blizzard",
                        `Character profile not found: ${s(name)}-${s(realm)}`
                    )
                } else {
                    logger.error(
                        "Blizzard",
                        `Failed to fetch character profile: ${s(response.status)}`
                    )
                }
                return null
            }

            return characterProfileResponseSchema.parse(await response.json())
        } catch (error) {
            logger.error("Blizzard", `Error fetching character profile: ${s(error)}`)
            return null
        }
    })
}

// ============================================================================
// Character Equipment API
// ============================================================================

/**
 * Fetch character equipment (all equipped items with details)
 */
export async function fetchCharacterEquipment(
    name: string,
    realm: string,
    region = "eu"
): Promise<EquipmentResponse | null> {
    return blizzardRateLimit(async () => {
        const token = await getAccessToken()
        if (!token) {
            return null
        }

        try {
            const realmSlug = realmNameToSlug(realm)
            const charName = name.toLowerCase()
            const namespace = `profile-${region}`

            const url = encodeURI(
                `https://${region}.api.blizzard.com/profile/wow/character/${realmSlug}/${charName}/equipment?namespace=${namespace}&locale=en_GB`
            )

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                if (response.status === 404) {
                    logger.debug(
                        "Blizzard",
                        `Character equipment not found: ${s(name)}-${s(realm)}`
                    )
                } else {
                    logger.error(
                        "Blizzard",
                        `Failed to fetch character equipment: ${s(response.status)}`
                    )
                }
                return null
            }

            return equipmentResponseSchema.parse(await response.json())
        } catch (error) {
            logger.error("Blizzard", `Error fetching character equipment: ${s(error)}`)
            return null
        }
    })
}

// ============================================================================
// Character Encounters (Raids) API
// ============================================================================

/**
 * Fetch character raid encounters (progression data)
 */
export async function fetchCharacterEncountersRaids(
    name: string,
    realm: string,
    region = "eu"
): Promise<EncountersRaidsResponse | null> {
    return blizzardRateLimit(async () => {
        const token = await getAccessToken()
        if (!token) {
            return null
        }

        try {
            const realmSlug = realmNameToSlug(realm)
            const charName = name.toLowerCase()
            const namespace = `profile-${region}`

            const url = encodeURI(
                `https://${region}.api.blizzard.com/profile/wow/character/${realmSlug}/${charName}/encounters/raids?namespace=${namespace}&locale=en_GB`
            )

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                if (response.status === 404) {
                    logger.debug(
                        "Blizzard",
                        `Character encounters not found: ${s(name)}-${s(realm)}`
                    )
                } else {
                    logger.error(
                        "Blizzard",
                        `Failed to fetch character encounters: ${s(response.status)}`
                    )
                }
                return null
            }

            return encountersRaidsResponseSchema.parse(await response.json())
        } catch (error) {
            logger.error("Blizzard", `Error fetching character encounters: ${s(error)}`)
            return null
        }
    })
}

// ============================================================================
// Slot Mapping Utilities
// ============================================================================

/**
 * Map Blizzard API slot types to our internal slot keys
 */
export const BLIZZARD_SLOT_MAP: Record<
    string,
    WowItemEquippedSlotKey | "shirt" | "tabard"
> = {
    HEAD: "head",
    NECK: "neck",
    SHOULDER: "shoulder",
    BACK: "back",
    CHEST: "chest",
    WRIST: "wrist",
    HANDS: "hands",
    WAIST: "waist",
    LEGS: "legs",
    FEET: "feet",
    FINGER_1: "finger1",
    FINGER_2: "finger2",
    TRINKET_1: "trinket1",
    TRINKET_2: "trinket2",
    MAIN_HAND: "main_hand",
    OFF_HAND: "off_hand",
    SHIRT: "shirt",
    TABARD: "tabard",
}

/**
 * Map Blizzard difficulty types to our internal difficulty names
 */
export const BLIZZARD_DIFFICULTY_MAP: Record<string, WowRaidDifficulty> = {
    NORMAL: "Normal",
    HEROIC: "Heroic",
    MYTHIC: "Mythic",
    LFR: "LFR",
}

// ============================================================================
// Journal Instance API (for raid boss data)
// ============================================================================

const journalEncounterRefSchema = z.object({
    id: z.number(),
    name: z.string(),
})

export const journalInstanceResponseSchema = z.object({
    id: z.number(),
    name: z.string(),
    encounters: z.array(journalEncounterRefSchema).optional(),
    expansion: z.object({
        id: z.number(),
        name: z.string(),
    }),
    category: z.object({
        type: z.string(), // "RAID", "DUNGEON", etc.
    }),
})
export type JournalInstanceResponse = z.infer<typeof journalInstanceResponseSchema>

/**
 * Fetch journal instance data (raid/dungeon info with all encounters)
 * Uses static namespace - data doesn't change often
 */
export async function fetchJournalInstance(
    instanceId: number,
    region = "eu"
): Promise<JournalInstanceResponse | null> {
    return blizzardRateLimit(async () => {
        const token = await getAccessToken()
        if (!token) {
            return null
        }

        try {
            const namespace = `static-${region}`
            const url = `https://${region}.api.blizzard.com/data/wow/journal-instance/${s(instanceId)}?namespace=${namespace}&locale=en_GB`

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                if (response.status === 404) {
                    logger.debug(
                        "Blizzard",
                        `Journal instance not found: ${s(instanceId)}`
                    )
                } else {
                    logger.error(
                        "Blizzard",
                        `Failed to fetch journal instance: ${s(response.status)}`
                    )
                }
                return null
            }

            return journalInstanceResponseSchema.parse(await response.json())
        } catch (error) {
            logger.error("Blizzard", `Error fetching journal instance: ${s(error)}`)
            return null
        }
    })
}

// ============================================================================
// Guild Roster API
// ============================================================================

/**
 * Fetch guild roster (all members with rank)
 */
export async function fetchGuildRoster(
    guildName: string,
    realm: string,
    region = "eu"
): Promise<GuildRosterResponse | null> {
    return blizzardRateLimit(async () => {
        const token = await getAccessToken()
        if (!token) {
            return null
        }

        try {
            const realmSlug = realmNameToSlug(realm)
            const guildSlug = guildName.toLowerCase().replace(/\s+/g, "-")
            const namespace = `profile-${region}`

            const url = encodeURI(
                `https://${region}.api.blizzard.com/data/wow/guild/${realmSlug}/${guildSlug}/roster?namespace=${namespace}&locale=en_GB`
            )

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                const errorBody = await response.text().catch(() => "")
                if (response.status === 404) {
                    logger.debug(
                        "Blizzard",
                        `Guild roster not found: ${s(guildName)}-${s(realm)}`
                    )
                } else {
                    logger.error(
                        "Blizzard",
                        `Failed to fetch guild roster: ${s(response.status)} - ${errorBody}`
                    )
                }
                return null
            }

            return guildRosterResponseSchema.parse(await response.json())
        } catch (error) {
            logger.error("Blizzard", `Error fetching guild roster: ${s(error)}`)
            return null
        }
    })
}

// ============================================================================
// Item API (for fetching individual item data)
// ============================================================================

const itemClassSchema = z.object({
    id: z.number(),
    name: z.string(),
})

export const itemResponseSchema = z.object({
    id: z.number(),
    name: z.string(),
    quality: z.object({
        type: z.string(),
        name: z.string(),
    }),
    level: z.number(),
    item_class: itemClassSchema,
    item_subclass: itemClassSchema,
    inventory_type: z.object({
        type: z.string(),
        name: z.string(),
    }),
    binding: z
        .object({
            type: z.string(),
            name: z.string(),
        })
        .optional(),
})
export type ItemResponse = z.infer<typeof itemResponseSchema>

export const itemMediaResponseSchema = z.object({
    assets: z.array(
        z.object({
            key: z.string(),
            value: z.string(),
        })
    ),
})
export type ItemMediaResponse = z.infer<typeof itemMediaResponseSchema>

/**
 * Fetch item data from Blizzard API
 */
export async function fetchItem(
    itemId: number,
    region = "eu"
): Promise<ItemResponse | null> {
    return blizzardRateLimit(async () => {
        const token = await getAccessToken()
        if (!token) {
            return null
        }

        try {
            const namespace = `static-${region}`
            const url = `https://${region}.api.blizzard.com/data/wow/item/${s(itemId)}?namespace=${namespace}&locale=en_GB`

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                if (response.status === 404) {
                    logger.debug("Blizzard", `Item not found: ${s(itemId)}`)
                } else {
                    logger.error(
                        "Blizzard",
                        `Failed to fetch item: ${s(response.status)}`
                    )
                }
                return null
            }

            return itemResponseSchema.parse(await response.json())
        } catch (error) {
            logger.error("Blizzard", `Error fetching item: ${s(error)}`)
            return null
        }
    })
}

/**
 * Fetch item media (icon) from Blizzard API
 */
export async function fetchItemMedia(
    itemId: number,
    region = "eu"
): Promise<string | null> {
    return blizzardRateLimit(async () => {
        const token = await getAccessToken()
        if (!token) {
            return null
        }

        try {
            const namespace = `static-${region}`
            const url = `https://${region}.api.blizzard.com/data/wow/media/item/${s(itemId)}?namespace=${namespace}&locale=en_GB`

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                if (response.status === 404) {
                    logger.debug("Blizzard", `Item media not found: ${s(itemId)}`)
                } else {
                    logger.error(
                        "Blizzard",
                        `Failed to fetch item media: ${s(response.status)}`
                    )
                }
                return null
            }

            const data = itemMediaResponseSchema.parse(await response.json())
            const icon = data.assets.find((a) => a.key === "icon")
            return icon?.value ?? null
        } catch (error) {
            logger.error("Blizzard", `Error fetching item media: ${s(error)}`)
            return null
        }
    })
}

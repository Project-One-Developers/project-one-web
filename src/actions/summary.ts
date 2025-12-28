"use server"

import { groupBy, keyBy } from "es-toolkit"

import {
    characterGameInfoRepo,
    type CharacterGameInfoCompact,
} from "@/db/repositories/character-game-info"
import { characterRepo, playerRepo } from "@/db/repositories/characters"
import { droptimizerRepo } from "@/db/repositories/droptimizer"
import { raiderioRepo } from "@/db/repositories/raiderio"
import { wowauditRepo } from "@/db/repositories/wowaudit"
import type { CharacterRaiderio } from "@/shared/schemas/raiderio.schemas"
import {
    DroptimizerWarn,
    RaiderioWarn,
    WowAuditWarn,
    type CharacterSummary,
    type CharacterWowAudit,
    type Droptimizer,
    type GearItem,
    type PlayerWithSummaryCompact,
} from "@/shared/types/types"

// Parse item level from various data sources
function parseItemLevel(
    droptimizers: Droptimizer[],
    wowAudit: CharacterWowAudit | null,
    raiderio: CharacterRaiderio | null
): string {
    // Prefer droptimizer data, then raiderio, then wowaudit
    if (droptimizers.length > 0) {
        // Get the most recent droptimizer's ilvl
        const sorted = [...droptimizers].sort((a, b) => b.simInfo.date - a.simInfo.date)
        const mostRecent = sorted[0]
        const ilvl = mostRecent?.itemsAverageItemLevelEquipped
        if (ilvl) {
            return ilvl.toFixed(1)
        }
    }
    if (raiderio?.averageItemLevel) {
        return raiderio.averageItemLevel
    }
    if (wowAudit?.averageIlvl) {
        return wowAudit.averageIlvl
    }
    return "?"
}

// Parse great vault from droptimizer data
function parseGreatVault(droptimizers: Droptimizer[]): GearItem[] {
    if (droptimizers.length === 0) {
        return []
    }

    // Get the most recent droptimizer with weekly chest data
    const sorted = [...droptimizers].sort((a, b) => b.simInfo.date - a.simInfo.date)
    const mostRecent = sorted[0]
    return mostRecent?.weeklyChest ?? []
}

// Parse tierset info from various sources
function parseTiersetInfo(
    droptimizers: Droptimizer[],
    wowAudit: CharacterWowAudit | null,
    raiderio: CharacterRaiderio | null
): GearItem[] {
    // Prefer droptimizer, then wowaudit, then raiderio
    if (droptimizers.length > 0) {
        const sorted = [...droptimizers].sort((a, b) => b.simInfo.date - a.simInfo.date)
        const mostRecent = sorted[0]
        return mostRecent?.tiersetInfo ?? []
    }
    if (wowAudit?.tiersetInfo) {
        return wowAudit.tiersetInfo
    }
    if (raiderio?.itemsEquipped) {
        return raiderio.itemsEquipped.filter((item) => item.item.tierset)
    }
    return []
}

// Parse currencies from droptimizer data
function parseCurrencies(droptimizers: Droptimizer[]) {
    if (droptimizers.length === 0) {
        return []
    }

    const sorted = [...droptimizers].sort((a, b) => b.simInfo.date - a.simInfo.date)
    const mostRecent = sorted[0]
    return mostRecent?.currencies ?? []
}

// Parse droptimizer warning status
function parseDroptimizerWarn(droptimizers: Droptimizer[]): DroptimizerWarn {
    if (droptimizers.length === 0) {
        return DroptimizerWarn.NotImported
    }

    // Check if droptimizers are outdated (older than 7 days)
    const oneWeekAgo = Date.now() / 1000 - 7 * 24 * 60 * 60
    const latestDate = Math.max(...droptimizers.map((d) => d.simInfo.date))

    if (latestDate < oneWeekAgo) {
        return DroptimizerWarn.Outdated
    }

    return DroptimizerWarn.None
}

// Parse wowaudit warning status
function parseWowAuditWarn(wowAudit: CharacterWowAudit | null): WowAuditWarn {
    if (!wowAudit) {
        return WowAuditWarn.NotTracked
    }
    return WowAuditWarn.None
}

// Parse raiderio warning status
function parseRaiderioWarn(raiderio: CharacterRaiderio | null): RaiderioWarn {
    if (!raiderio) {
        return RaiderioWarn.NotTracked
    }
    return RaiderioWarn.None
}

export async function getRosterSummary(): Promise<CharacterSummary[]> {
    // Fetch roster first to scope subsequent queries
    const roster = await characterRepo.getWithPlayerList()
    const charList = roster.map((char) => ({ name: char.name, realm: char.realm }))

    // Fetch only data for roster characters (not all tracked characters)
    const [latestDroptimizers, wowAuditData, raiderioData] = await Promise.all([
        droptimizerRepo.getLatestByChars(charList),
        wowauditRepo.getByChars(charList),
        raiderioRepo.getByChars(charList),
    ])

    const droptimizerByChar = groupBy(
        latestDroptimizers,
        (d) => `${d.charInfo.name}-${d.charInfo.server}`
    )
    const wowAuditByChar = keyBy(wowAuditData, (w) => `${w.name}-${w.realm}`)
    const raiderioByChar = keyBy(raiderioData, (r) => `${r.name}-${r.realm}`)

    const res: CharacterSummary[] = roster.map((char) => {
        const charKey: `${string}-${string}` = `${char.name}-${char.realm}`

        const charDroptimizers = droptimizerByChar[charKey] ?? []
        const charWowAudit: CharacterWowAudit | null = wowAuditByChar[charKey] ?? null
        const charRaiderio: CharacterRaiderio | null = raiderioByChar[charKey] ?? null

        return {
            character: char,
            itemLevel: parseItemLevel(charDroptimizers, charWowAudit, charRaiderio),
            weeklyChest: parseGreatVault(charDroptimizers),
            tierset: parseTiersetInfo(charDroptimizers, charWowAudit, charRaiderio),
            currencies: parseCurrencies(charDroptimizers),
            warnDroptimizer: parseDroptimizerWarn(charDroptimizers),
            warnWowAudit: parseWowAuditWarn(charWowAudit),
            warnRaiderio: parseRaiderioWarn(charRaiderio),
        }
    })

    return res
}

function parseItemLevelCompact(gameInfo: CharacterGameInfoCompact | undefined): string {
    return (
        gameInfo?.droptimizerIlvl?.toFixed(1) ??
        gameInfo?.raiderioAvgIlvl ??
        gameInfo?.wowauditAvgIlvl ??
        "?"
    )
}

function parseTiersetCountCompact(
    gameInfo: CharacterGameInfoCompact | undefined
): number {
    return (
        gameInfo?.droptimizerTiersetInfo?.length ??
        gameInfo?.wowauditTiersetInfo?.length ??
        gameInfo?.raiderioItemsEquipped?.filter((item) => item.item.tierset).length ??
        0
    )
}

/**
 * Consolidated action for roster page - fetches all data in a single DB query
 * Uses combined character game info query to reduce 3 DB round trips to 1
 */
export async function getPlayersWithSummaryCompact(): Promise<
    PlayerWithSummaryCompact[]
> {
    // Single fetch: get all players with their characters
    const playersWithChars = await playerRepo.getWithCharactersList()

    // Extract all characters across all players for combined query
    const allChars = playersWithChars.flatMap((p) => p.characters)
    const charList = allChars.map((c) => ({ name: c.name, realm: c.realm }))

    // Single combined query instead of 3 parallel queries
    const gameInfoData = await characterGameInfoRepo.getByCharsCompact(charList)

    // Build lookup map for O(1) access
    const gameInfoByChar = keyBy(gameInfoData, (g) => `${g.charName}-${g.charRealm}`)

    // Build result grouped by player
    return playersWithChars.map((player) => ({
        id: player.id,
        name: player.name,
        charsSummary: player.characters.map((char) => {
            const charKey: `${string}-${string}` = `${char.name}-${char.realm}`
            const gameInfo = gameInfoByChar[charKey]

            return {
                character: {
                    ...char,
                    player: { id: player.id, name: player.name },
                },
                itemLevel: parseItemLevelCompact(gameInfo),
                tiersetCount: parseTiersetCountCompact(gameInfo),
            }
        }),
    }))
}

"use server"

import { characterRepo } from "@/db/repositories/characters"
import { droptimizerRepo, type DroptimizerCompact } from "@/db/repositories/droptimizer"
import { raiderioRepo } from "@/db/repositories/raiderio"
import { wowauditRepo } from "@/db/repositories/wowaudit"
import type { CharacterRaiderio } from "@/shared/schemas/raiderio.schemas"
import {
    DroptimizerWarn,
    RaiderioWarn,
    WowAuditWarn,
    type CharacterSummary,
    type CharacterSummaryCompact,
    type CharacterWowAudit,
    type Droptimizer,
    type GearItem,
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
    const [roster, latestDroptimizers, wowAuditData, raiderioData] = await Promise.all([
        characterRepo.getWithPlayerList(),
        droptimizerRepo.getLatestList(),
        wowauditRepo.getAll(),
        raiderioRepo.getAll(),
    ])

    const res: CharacterSummary[] = roster.map((char) => {
        // Get latest droptimizers for a given char
        const charDroptimizers = latestDroptimizers.filter(
            (dropt) =>
                dropt.charInfo.name === char.name && dropt.charInfo.server === char.realm
        )

        const charWowAudit: CharacterWowAudit | null =
            wowAuditData.find(
                (wowaudit) => wowaudit.name === char.name && wowaudit.realm === char.realm
            ) ?? null

        const charRaiderio: CharacterRaiderio | null =
            raiderioData.find(
                (raiderio) => raiderio.name === char.name && raiderio.realm === char.realm
            ) ?? null

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

// Compact version for roster page - only fetches item level and tierset count
// Avoids loading full droptimizers with all upgrades, weekly chest, currencies, etc.
function parseItemLevelCompact(
    droptimizers: DroptimizerCompact[],
    raiderio: CharacterRaiderio | null,
    wowAudit: CharacterWowAudit | null
): string {
    // Prefer droptimizer data (most recent by simDate)
    if (droptimizers.length > 0) {
        const sorted = [...droptimizers].sort((a, b) => b.simDate - a.simDate)
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

function parseTiersetCountCompact(
    droptimizers: DroptimizerCompact[],
    wowAudit: CharacterWowAudit | null,
    raiderio: CharacterRaiderio | null
): number {
    if (droptimizers.length > 0) {
        const sorted = [...droptimizers].sort((a, b) => b.simDate - a.simDate)
        const mostRecent = sorted[0]
        return mostRecent?.tiersetInfo?.length ?? 0
    }
    if (wowAudit?.tiersetInfo) {
        return wowAudit.tiersetInfo.length
    }
    if (raiderio?.itemsEquipped) {
        return raiderio.itemsEquipped.filter((item) => item.item.tierset).length
    }
    return 0
}

export async function getRosterSummaryCompact(): Promise<CharacterSummaryCompact[]> {
    const roster = await characterRepo.getWithPlayerList()

    // Fetch droptimizer data only for characters in roster (more efficient)
    const charList = roster.map((char) => ({ name: char.name, realm: char.realm }))

    const [latestDroptimizers, wowAuditData, raiderioData] = await Promise.all([
        droptimizerRepo.getLatestByCharsCompact(charList),
        wowauditRepo.getAll(),
        raiderioRepo.getAll(),
    ])

    const res: CharacterSummaryCompact[] = roster.map((char) => {
        // Get latest droptimizers for a given char
        const charDroptimizers = latestDroptimizers.filter(
            (dropt) =>
                dropt.characterName === char.name && dropt.characterServer === char.realm
        )

        const charWowAudit: CharacterWowAudit | null =
            wowAuditData.find(
                (wowaudit) => wowaudit.name === char.name && wowaudit.realm === char.realm
            ) ?? null

        const charRaiderio: CharacterRaiderio | null =
            raiderioData.find(
                (raiderio) => raiderio.name === char.name && raiderio.realm === char.realm
            ) ?? null

        return {
            character: char,
            itemLevel: parseItemLevelCompact(
                charDroptimizers,
                charRaiderio,
                charWowAudit
            ),
            tiersetCount: parseTiersetCountCompact(
                charDroptimizers,
                charWowAudit,
                charRaiderio
            ),
        }
    })

    return res
}

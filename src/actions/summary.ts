"use server"

import { getCharactersWithPlayerList } from "@/db/repositories/characters"
import { getDroptimizerLatestList } from "@/db/repositories/droptimizer"
import { getAllCharacterRaiderio } from "@/db/repositories/raiderio"
import { getAllCharacterWowAudit } from "@/db/repositories/wowaudit"
import type {
    CharacterSummary,
    CharacterWowAudit,
    Droptimizer,
    DroptimizerWarn,
    GearItem,
    RaiderioWarn,
    WowAuditWarn,
} from "@/shared/types/types"
import type { CharacterRaiderio } from "@/shared/schemas/raiderio.schemas"

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
        const ilvl = sorted[0].itemsAverageItemLevelEquipped
        if (ilvl) return ilvl.toFixed(1)
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
    if (droptimizers.length === 0) return []

    // Get the most recent droptimizer with weekly chest data
    const sorted = [...droptimizers].sort((a, b) => b.simInfo.date - a.simInfo.date)
    return sorted[0].weeklyChest || []
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
        return sorted[0].tiersetInfo || []
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
    if (droptimizers.length === 0) return []

    const sorted = [...droptimizers].sort((a, b) => b.simInfo.date - a.simInfo.date)
    return sorted[0].currencies || []
}

// Parse droptimizer warning status
function parseDroptimizerWarn(droptimizers: Droptimizer[]): DroptimizerWarn {
    if (droptimizers.length === 0) return "missing" as DroptimizerWarn

    // Check if droptimizers are outdated (older than 7 days)
    const oneWeekAgo = Date.now() / 1000 - 7 * 24 * 60 * 60
    const latestDate = Math.max(...droptimizers.map((d) => d.simInfo.date))

    if (latestDate < oneWeekAgo) {
        return "outdated" as DroptimizerWarn
    }

    return "none" as DroptimizerWarn
}

// Parse wowaudit warning status
function parseWowAuditWarn(wowAudit: CharacterWowAudit | null): WowAuditWarn {
    if (!wowAudit) return "not-tracked" as WowAuditWarn
    return "none" as WowAuditWarn
}

// Parse raiderio warning status
function parseRaiderioWarn(raiderio: CharacterRaiderio | null): RaiderioWarn {
    if (!raiderio) return "not-tracked" as RaiderioWarn
    return "none" as RaiderioWarn
}

export async function getRosterSummaryAction(): Promise<CharacterSummary[]> {
    const [roster, latestDroptimizers, wowAuditData, raiderioData] = await Promise.all([
        getCharactersWithPlayerList(),
        getDroptimizerLatestList(),
        getAllCharacterWowAudit(),
        getAllCharacterRaiderio(),
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

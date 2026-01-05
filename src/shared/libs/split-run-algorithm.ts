import { s } from "@/shared/libs/string-utils"
import type { Run, RunStats, SplitRunParams } from "@/shared/models/split-run.models"
import type { CharacterSummaryCompact, PlayerWithSummaryCompact } from "@/shared/types"
import { CLASS_TO_ARMOR_TYPE, CLASSES_NAME } from "@/shared/wow.consts"

/**
 * Calculate optimal split runs for raid planning
 * Distributes characters across runs while satisfying:
 * - Hard constraint: Same player's characters in different runs
 * - Hard constraint: Minimum 2 tanks, 4 healers per run (warned if not met)
 * - Soft optimization: Balance mains evenly across armor types
 */
export function calculateSplitRuns(
    players: PlayerWithSummaryCompact[],
    params: SplitRunParams
): Run[] {
    // Phase 1: Prepare data
    let allCharacters = players.flatMap((player) => player.charsSummary)

    // Filter by minimum item level if specified
    if (params.minItemLevel !== undefined) {
        const minIlvl = params.minItemLevel
        allCharacters = allCharacters.filter((char) => {
            const ilvl = parseInt(char.itemLevel, 10)
            return !isNaN(ilvl) && ilvl >= minIlvl
        })
    }

    if (allCharacters.length === 0) {
        return []
    }

    // Create character map with player info for quick lookups
    const charToPlayer = new Map<string, string>()
    for (const player of players) {
        for (const charSummary of player.charsSummary) {
            charToPlayer.set(charSummary.character.id, player.id)
        }
    }

    // Group characters by role
    const tanks = allCharacters.filter((c) => c.character.role === "Tank")
    const healers = allCharacters.filter((c) => c.character.role === "Healer")
    const dps = allCharacters.filter((c) => c.character.role === "DPS")

    // Phase 2: Initialize runs
    const runs: Run[] = Array.from({ length: params.numRuns }, () => ({
        id: crypto.randomUUID(),
        characters: [],
        stats: {
            tanks: 0,
            healers: 0,
            dps: 0,
            armorTypes: {},
        },
        warnings: [],
    }))

    // Phase 3: Distribute tanks (round-robin)
    distributeCharacters(tanks, runs, charToPlayer)

    // Phase 4: Distribute healers (round-robin)
    distributeCharacters(healers, runs, charToPlayer)

    // Phase 5: Distribute DPS (weighted by armor type balance)
    distributeDPS(dps, runs, charToPlayer)

    // Phase 6: Calculate stats and warnings
    for (const run of runs) {
        run.stats = calculateRunStats(run)
        run.warnings = generateWarnings(run, params.targetSize)
    }

    return runs
}

/**
 * Distribute characters round-robin across runs
 * Ensures same player's characters go to different runs
 */
function distributeCharacters(
    characters: CharacterSummaryCompact[],
    runs: Run[],
    charToPlayer: Map<string, string>
): void {
    let runIndex = 0

    for (const char of characters) {
        // Find next available run that doesn't have this player's character
        let attempts = 0
        while (attempts < runs.length) {
            const currentRun = runs[runIndex % runs.length]
            if (currentRun && canAddToRun(char, currentRun, charToPlayer)) {
                currentRun.characters.push(char)
                runIndex++
                break
            }
            runIndex++
            attempts++
        }

        // If we couldn't place the character in any run (all runs have this player)
        // This happens when a player has more characters than available runs
        // Skip this character to maintain the constraint
        if (attempts === runs.length) {
            // Character cannot be placed - player has too many characters for number of runs
            // Skip this character to maintain one-per-player-per-run constraint
            continue
        }
    }
}

/**
 * Distribute DPS with armor type balancing
 * Prefers runs with fewer MAIN characters of the same armor type
 */
function distributeDPS(
    dpsChars: CharacterSummaryCompact[],
    runs: Run[],
    charToPlayer: Map<string, string>
): void {
    for (const char of dpsChars) {
        const armorType = CLASS_TO_ARMOR_TYPE[char.character.class]

        // Find best run: one that doesn't have this player and has lowest armor type count
        let bestRun: Run | null = null
        let bestScore = -1

        for (const run of runs) {
            if (!canAddToRun(char, run, charToPlayer)) {
                continue
            }

            // Calculate score: prioritize runs with fewer MAINS of this armor type
            // Only count mains for armor type balancing
            const armorTypeCount = run.characters.filter(
                (c) =>
                    c.character.main &&
                    CLASS_TO_ARMOR_TYPE[c.character.class] === armorType
            ).length

            // Also consider total run size to keep runs somewhat balanced
            const sizeScore = run.characters.length

            // Lower is better (fewer armor conflicts among mains, smaller runs preferred)
            const score = -armorTypeCount * 10 - sizeScore

            if (bestRun === null || score > bestScore) {
                bestRun = run
                bestScore = score
            }
        }

        // Add to best run, or skip if no valid run found
        if (bestRun) {
            bestRun.characters.push(char)
        }
        // If no valid run found (all runs have this player's character already),
        // skip this character to maintain one-per-player-per-run constraint
    }
}

/**
 * Check if character can be added to run
 * Returns false if run already has a character from the same player
 */
function canAddToRun(
    char: CharacterSummaryCompact,
    run: Run,
    charToPlayer: Map<string, string>
): boolean {
    const playerId = charToPlayer.get(char.character.id)
    if (!playerId) {
        return true
    } // Safety fallback

    // Check if any character in the run belongs to the same player
    return !run.characters.some((c) => charToPlayer.get(c.character.id) === playerId)
}

/**
 * Calculate run statistics
 * Note: Armor types only count MAINS, not alts
 */
function calculateRunStats(run: Run): RunStats {
    const stats: RunStats = {
        tanks: 0,
        healers: 0,
        dps: 0,
        armorTypes: {},
    }

    for (const char of run.characters) {
        // Count by role
        if (char.character.role === "Tank") {
            stats.tanks++
        } else if (char.character.role === "Healer") {
            stats.healers++
        } else {
            stats.dps++
        }

        // Count by armor type - ONLY MAINS
        if (char.character.main) {
            const armorType = CLASS_TO_ARMOR_TYPE[char.character.class]

            stats.armorTypes[armorType] = (stats.armorTypes[armorType] ?? 0) + 1
        }
    }

    return stats
}

/**
 * Generate warnings for a run
 */
function generateWarnings(run: Run, targetSize: number): string[] {
    const warnings: string[] = []

    // Tank warnings
    if (run.stats.tanks < 2) {
        warnings.push(
            `Only ${s(run.stats.tanks)} tank${run.stats.tanks === 1 ? "" : "s"} (need 2)`
        )
    }

    // Healer warnings
    if (run.stats.healers < 4) {
        warnings.push(
            `Only ${s(run.stats.healers)} healer${run.stats.healers === 1 ? "" : "s"} (need 4)`
        )
    }

    // Size warnings
    const totalSize = run.characters.length
    if (totalSize < targetSize) {
        warnings.push(`Only ${s(totalSize)}/${s(targetSize)} players`)
    }

    // Class buff warnings (all classes except Death Knight provide unique buffs)
    const classesInRun = new Set(run.characters.map((c) => c.character.class))
    const requiredClasses = CLASSES_NAME.filter(
        (className) => className !== "Death Knight"
    )
    const missingClasses = requiredClasses.filter(
        (className) => !classesInRun.has(className)
    )

    if (missingClasses.length > 0) {
        warnings.push(`Missing buffs: ${missingClasses.join(", ")}`)
    }

    return warnings
}

/**
 * Helper to calculate armor type variance (for optimization)
 * Lower variance = better balance across armor types
 */
export function calculateArmorTypeVariance(run: Run): number {
    const counts = Object.values(run.stats.armorTypes).filter(
        (count): count is number => count !== undefined
    )
    if (counts.length === 0) {
        return 0
    }

    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length
    const variance =
        counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length

    return variance
}

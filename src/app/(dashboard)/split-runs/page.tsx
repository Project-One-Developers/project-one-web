"use client"

import { Swords } from "lucide-react"
import { useState, type JSX } from "react"
import { toast } from "sonner"
import SplitRunForm from "@/components/split-run-form"
import SplitRunResults from "@/components/split-run-results"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { usePlayersSummaryCompact } from "@/lib/queries/players"
import { calculateSplitRuns } from "@/shared/libs/split-run-algorithm"
import { s } from "@/shared/libs/string-utils"
import type { Run, SplitRunParams } from "@/shared/models/split-run.models"
import { CLASS_TO_ARMOR_TYPE } from "@/shared/wow.consts"

export default function SplitRunsPage(): JSX.Element {
    const playersQuery = usePlayersSummaryCompact()

    const [runs, setRuns] = useState<Run[]>([])
    const [params, setParams] = useState<SplitRunParams | null>(null)
    const [isCalculating, setIsCalculating] = useState(false)

    const handleCalculate = (newParams: SplitRunParams) => {
        if (!playersQuery.data) {
            toast.error("No player data available")
            return
        }

        setIsCalculating(true)
        setParams(newParams)

        // Use setTimeout to avoid blocking the UI
        setTimeout(() => {
            try {
                const results = calculateSplitRuns(playersQuery.data, newParams)

                if (results.length === 0) {
                    toast.error("No characters available to distribute")
                } else {
                    toast.success(`Created ${s(results.length)} split runs`)
                }

                setRuns(results)
            } catch (error) {
                toast.error(
                    `Failed to calculate split runs: ${error instanceof Error ? error.message : "Unknown error"}`
                )
            } finally {
                setIsCalculating(false)
            }
        }, 0)
    }

    const handleCharacterMove = (
        sourceRunId: string,
        targetRunId: string,
        charId: string
    ) => {
        const sourceRun = runs.find((r) => r.id === sourceRunId)
        const targetRun = runs.find((r) => r.id === targetRunId)

        if (!sourceRun || !targetRun) {
            return
        }

        // Find the character in the source run
        const charIndex = sourceRun.characters.findIndex((c) => c.character.id === charId)
        if (charIndex === -1) {
            return
        }

        const character = sourceRun.characters[charIndex]
        if (!character) {
            return
        }

        // Check if target run already has a character from the same player
        const hasPlayerChar = targetRun.characters.some(
            (c) => c.character.playerId === character.character.playerId
        )

        if (hasPlayerChar) {
            toast.error("Target run already has a character from this player")
            return
        }

        // Remove character from source run
        const newSourceCharacters = [...sourceRun.characters]
        newSourceCharacters.splice(charIndex, 1)

        // Add character to target run
        const newTargetCharacters = [...targetRun.characters, character]

        // Update runs
        const newRuns = runs.map((run) => {
            if (run.id === sourceRunId) {
                return {
                    ...run,
                    characters: newSourceCharacters,
                    stats: calculateRunStats(newSourceCharacters),
                }
            }
            if (run.id === targetRunId) {
                return {
                    ...run,
                    characters: newTargetCharacters,
                    stats: calculateRunStats(newTargetCharacters),
                }
            }
            return run
        })

        setRuns(newRuns)
        toast.success("Character moved successfully")
    }

    const handleCharacterReorder = (
        runId: string,
        charId: string,
        _targetCharId: string,
        targetIndex: number
    ) => {
        const run = runs.find((r) => r.id === runId)
        if (!run) {
            return
        }

        const sourceIndex = run.characters.findIndex((c) => c.character.id === charId)
        if (sourceIndex === -1) {
            return
        }

        // Create new array with reordered characters
        const newCharacters = [...run.characters]
        const [movedChar] = newCharacters.splice(sourceIndex, 1)
        if (!movedChar) {
            return
        }

        newCharacters.splice(targetIndex, 0, movedChar)

        // Update run
        const newRuns = runs.map((r) => {
            if (r.id === runId) {
                return {
                    ...r,
                    characters: newCharacters,
                    stats: calculateRunStats(newCharacters),
                }
            }
            return r
        })

        setRuns(newRuns)
        toast.success("Character reordered")
    }

    const handleCharacterSwap = (
        sourceRunId: string,
        sourceCharId: string,
        targetRunId: string,
        targetCharId: string
    ) => {
        const sourceRun = runs.find((r) => r.id === sourceRunId)
        const targetRun = runs.find((r) => r.id === targetRunId)

        if (!sourceRun || !targetRun) {
            return
        }

        const sourceCharIndex = sourceRun.characters.findIndex(
            (c) => c.character.id === sourceCharId
        )
        const targetCharIndex = targetRun.characters.findIndex(
            (c) => c.character.id === targetCharId
        )

        if (sourceCharIndex === -1 || targetCharIndex === -1) {
            return
        }

        const sourceChar = sourceRun.characters[sourceCharIndex]
        const targetChar = targetRun.characters[targetCharIndex]

        if (!sourceChar || !targetChar) {
            return
        }

        // Create new arrays with swapped characters
        const newSourceCharacters = [...sourceRun.characters]
        const newTargetCharacters = [...targetRun.characters]

        newSourceCharacters[sourceCharIndex] = targetChar
        newTargetCharacters[targetCharIndex] = sourceChar

        // Update runs
        const newRuns = runs.map((run) => {
            if (run.id === sourceRunId) {
                return {
                    ...run,
                    characters: newSourceCharacters,
                    stats: calculateRunStats(newSourceCharacters),
                }
            }
            if (run.id === targetRunId) {
                return {
                    ...run,
                    characters: newTargetCharacters,
                    stats: calculateRunStats(newTargetCharacters),
                }
            }
            return run
        })

        setRuns(newRuns)
        toast.success("Characters swapped successfully")
    }

    const handleExport = () => {
        // Generate CSV
        const csvLines: string[] = [
            "Run,Character,Player,Role,Class,Armor Type,Item Level",
        ]

        for (let i = 0; i < runs.length; i++) {
            const run = runs[i]
            if (!run) {
                continue
            }

            for (const charSummary of run.characters) {
                const char = charSummary.character
                const armorType = CLASS_TO_ARMOR_TYPE[char.class]
                csvLines.push(
                    `Run ${s(i + 1)},${char.name},${char.player.name},${char.role},${char.class},${armorType},${charSummary.itemLevel}`
                )
            }
        }

        const csv = csvLines.join("\n")

        // Download CSV
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)

        const dateStr = new Date().toISOString().split("T")[0] ?? "unknown"
        link.setAttribute("href", url)
        link.setAttribute("download", `split-runs-${dateStr}.csv`)
        link.style.visibility = "hidden"

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast.success("Exported split runs to CSV")
    }

    // Helper to recalculate stats for a run
    // Note: Armor types only count MAINS, not alts
    const calculateRunStats = (characters: Run["characters"]) => {
        const stats = {
            tanks: 0,
            healers: 0,
            dps: 0,
            armorTypes: {} as Record<string, number>,
        }

        for (const char of characters) {
            if (char.character.role === "Tank") {
                stats.tanks++
            } else if (char.character.role === "Healer") {
                stats.healers++
            } else {
                stats.dps++
            }

            // Only count armor types for MAINS
            if (char.character.main) {
                const armorType = CLASS_TO_ARMOR_TYPE[char.character.class]

                stats.armorTypes[armorType] = (stats.armorTypes[armorType] ?? 0) + 1
            }
        }

        return stats
    }

    // Loading state for initial data fetch
    if (playersQuery.isLoading) {
        return (
            <div className="w-full min-h-screen flex flex-col gap-6 p-6 md:p-8">
                <LoadingSpinner size="lg" text="Loading roster data..." />
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen flex flex-col gap-6 p-6 md:p-8">
            {/* Form */}
            <SplitRunForm onCalculate={handleCalculate} isCalculating={isCalculating} />

            {/* Calculating state */}
            {isCalculating && (
                <LoadingSpinner size="lg" text="Calculating optimal split runs..." />
            )}

            {/* Results */}
            {!isCalculating && runs.length > 0 && params && (
                <SplitRunResults
                    runs={runs}
                    targetSize={params.targetSize}
                    onCharacterMove={handleCharacterMove}
                    onCharacterReorder={handleCharacterReorder}
                    onCharacterSwap={handleCharacterSwap}
                    onExport={handleExport}
                />
            )}

            {/* Empty state */}
            {!isCalculating && runs.length === 0 && (
                <EmptyState
                    icon={<Swords className="w-8 h-8" />}
                    title="No split runs calculated yet"
                    description="Enter your parameters above and click Calculate to generate optimal run distribution"
                />
            )}
        </div>
    )
}

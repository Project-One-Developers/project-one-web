"use client"

import { partition } from "es-toolkit"
import { Download, BarChart } from "lucide-react"
import { useState, type JSX } from "react"
import { s } from "@/shared/libs/string-utils"
import type { Run } from "@/shared/models/split-run.models"
import RunCard from "./run-card"
import { Button } from "./ui/button"
import { GlassCard } from "./ui/glass-card"
import { StatBadge } from "./ui/stat-badge"

type SplitRunResultsProps = {
    runs: Run[]
    targetSize: number
    onCharacterMove: (sourceRunId: string, targetRunId: string, charId: string) => void
    onCharacterReorder: (
        runId: string,
        charId: string,
        targetCharId: string,
        targetIndex: number
    ) => void
    onCharacterSwap: (
        sourceRunId: string,
        sourceCharId: string,
        targetRunId: string,
        targetCharId: string
    ) => void
    onExport: () => void
}

export default function SplitRunResults({
    runs,
    targetSize,
    onCharacterMove,
    onCharacterReorder,
    onCharacterSwap,
    onExport,
}: SplitRunResultsProps): JSX.Element {
    const [draggedCharId, setDraggedCharId] = useState<string | null>(null)
    const [dragSourceRunId, setDragSourceRunId] = useState<string | null>(null)
    const [dragOverRunId, setDragOverRunId] = useState<string | null>(null)

    const handleDragStart = (charId: string, sourceRunId: string) => {
        setDraggedCharId(charId)
        setDragSourceRunId(sourceRunId)
    }

    const handleDragOver = (e: React.DragEvent, runId: string) => {
        e.preventDefault()
        setDragOverRunId(runId)
    }

    const handleDrop = (e: React.DragEvent, targetRunId: string) => {
        e.preventDefault()
        setDragOverRunId(null)

        if (!draggedCharId || !dragSourceRunId) {
            return
        }
        if (dragSourceRunId === targetRunId) {
            return
        } // Same run, no action needed

        onCharacterMove(dragSourceRunId, targetRunId, draggedCharId)

        setDraggedCharId(null)
        setDragSourceRunId(null)
    }

    const handleDropOnCharacter = (
        _e: React.DragEvent,
        targetRunId: string,
        targetCharId: string,
        targetIndex: number
    ) => {
        if (!draggedCharId || !dragSourceRunId) {
            return
        }
        if (draggedCharId === targetCharId) {
            return
        } // Same character

        // Check if same run (reorder) or different run (swap or move)
        if (dragSourceRunId === targetRunId) {
            // Reorder within same run
            onCharacterReorder(targetRunId, draggedCharId, targetCharId, targetIndex)
        } else {
            // Different runs - check if characters belong to same player (swap) or not (move)
            const sourceRun = runs.find((r) => r.id === dragSourceRunId)
            const targetRun = runs.find((r) => r.id === targetRunId)
            const sourceChar = sourceRun?.characters.find(
                (c) => c.character.id === draggedCharId
            )
            const targetChar = targetRun?.characters.find(
                (c) => c.character.id === targetCharId
            )

            if (sourceChar?.character.playerId === targetChar?.character.playerId) {
                // Same player - swap
                onCharacterSwap(dragSourceRunId, draggedCharId, targetRunId, targetCharId)
            } else {
                // Different players - regular move
                onCharacterMove(dragSourceRunId, targetRunId, draggedCharId)
            }
        }

        setDraggedCharId(null)
        setDragSourceRunId(null)
    }

    const handleDragEnd = () => {
        setDragOverRunId(null)
        setDraggedCharId(null)
        setDragSourceRunId(null)
    }

    // Calculate aggregate stats with main/alt split
    const totalCharacters = runs.reduce((sum, run) => sum + run.characters.length, 0)

    // Count mains and alts separately for each role
    const allCharacters = runs.flatMap((run) => run.characters)
    const [mains, alts] = partition(allCharacters, (c) => c.character.main)
    const mainsByRole = Object.groupBy(mains, (c) => c.character.role)
    const altsByRole = Object.groupBy(alts, (c) => c.character.role)

    const runsWithWarnings = runs.filter((run) => run.warnings.length > 0).length

    return (
        <div className="flex flex-col gap-6">
            {/* Summary bar */}
            <GlassCard
                variant="solid"
                padding="sm"
                className="backdrop-blur-none bg-card/80"
            >
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                    {/* Stats */}
                    <div className="flex flex-wrap gap-3">
                        <StatBadge
                            variant="primary"
                            icon={<BarChart className="w-3.5 h-3.5" />}
                            label="Total"
                            value={totalCharacters}
                        />
                        <StatBadge
                            variant="default"
                            label="Tanks"
                            value={`${s(mainsByRole.Tank?.length ?? 0)} mains / ${s(altsByRole.Tank?.length ?? 0)} alts`}
                        />
                        <StatBadge
                            variant="success"
                            label="Healers"
                            value={`${s(mainsByRole.Healer?.length ?? 0)} mains / ${s(altsByRole.Healer?.length ?? 0)} alts`}
                        />
                        <StatBadge
                            variant="info"
                            label="DPS"
                            value={`${s(mainsByRole.DPS?.length ?? 0)} mains / ${s(altsByRole.DPS?.length ?? 0)} alts`}
                        />
                        {runsWithWarnings > 0 && (
                            <StatBadge
                                variant="warning"
                                label="Warnings"
                                value={runsWithWarnings}
                            />
                        )}
                    </div>

                    {/* Export button */}
                    <Button
                        onClick={onExport}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </Button>
                </div>
            </GlassCard>

            {/* Drag-and-drop hint */}
            <div className="text-sm text-muted-foreground text-center">
                Drag and drop characters between runs to adjust the composition
            </div>

            {/* Runs grid */}
            <div
                className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
                onDragEnd={handleDragEnd}
            >
                {runs.map((run, index) => (
                    <RunCard
                        key={run.id}
                        run={run}
                        runIndex={index}
                        targetSize={targetSize}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDropOnCharacter={handleDropOnCharacter}
                        isDragOver={dragOverRunId === run.id}
                    />
                ))}
            </div>
        </div>
    )
}

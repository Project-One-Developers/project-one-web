"use client"

import { AlertTriangle, Shield, Heart, Swords, Crown } from "lucide-react"
import Image from "next/image"
import type { JSX } from "react"
import { cn } from "@/lib/utils"
import { classIcon } from "@/lib/wow-icon"
import { s } from "@/shared/libs/string-utils"
import type { Run } from "@/shared/models/split-run.models"
import { GlassCard } from "./ui/glass-card"
import { StatBadge } from "./ui/stat-badge"

type RunCardProps = {
    run: Run
    runIndex: number
    targetSize: number
    onDragStart?: (charId: string, sourceRunId: string) => void
    onDragOver?: (e: React.DragEvent, runId: string) => void
    onDrop?: (e: React.DragEvent, targetRunId: string) => void
    onDropOnCharacter?: (
        e: React.DragEvent,
        targetRunId: string,
        targetCharId: string,
        targetIndex: number
    ) => void
    isDragOver?: boolean
}

export default function RunCard({
    run,
    runIndex,
    targetSize,
    onDragStart,
    onDragOver,
    onDrop,
    onDropOnCharacter,
    isDragOver = false,
}: RunCardProps): JSX.Element {
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        if (onDragOver) {
            onDragOver(e, run.id)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        if (onDrop) {
            onDrop(e, run.id)
        }
    }

    // Get class color from WoW official colors
    const getClassColor = (className: string): string => {
        const classColors: Record<string, string> = {
            "Death Knight": "#C41E3A",
            "Demon Hunter": "#A330C9",
            Druid: "#FF7C0A",
            Evoker: "#33937F",
            Hunter: "#AAD372",
            Mage: "#3FC7EB",
            Monk: "#00FF98",
            Paladin: "#F48CBA",
            Priest: "#FFFFFF",
            Rogue: "#FFF468",
            Shaman: "#0070DD",
            Warlock: "#8788EE",
            Warrior: "#C69B6D",
        }
        return classColors[className] ?? "#999999"
    }

    // Separate characters by role
    const tanks = run.characters.filter((c) => c.character.role === "Tank")
    const healers = run.characters.filter((c) => c.character.role === "Healer")
    const dps = run.characters.filter((c) => c.character.role === "DPS")

    // Calculate needed helpers
    const tankHelpers = Math.max(0, 2 - tanks.length)
    const healerHelpers = Math.max(0, 4 - healers.length)
    const totalCharacters = run.characters.length
    const dpsHelpers = Math.max(
        0,
        targetSize - totalCharacters - tankHelpers - healerHelpers
    )
    const totalHelpers = tankHelpers + healerHelpers + dpsHelpers

    // Render a player cell
    const renderPlayerCell = (charSummary: (typeof run.characters)[0], index: number) => {
        const char = charSummary.character
        const classColor = getClassColor(char.class)

        return (
            <div
                key={char.id}
                draggable={!!onDragStart}
                onDragStart={() => onDragStart?.(char.id, run.id)}
                onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                }}
                onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (onDropOnCharacter) {
                        onDropOnCharacter(e, run.id, char.id, index)
                    }
                }}
                className={cn(
                    "relative px-3 py-2 rounded-lg border border-border/40 transition-all",
                    "flex items-center justify-between gap-2",
                    onDragStart && "cursor-move hover:opacity-70 hover:scale-[1.02]"
                )}
                style={{
                    backgroundColor: `${classColor}20`,
                    borderColor: `${classColor}40`,
                }}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <Image
                        src={classIcon.get(char.class) ?? ""}
                        alt={char.class}
                        width={20}
                        height={20}
                        className="rounded shrink-0"
                    />
                    <span
                        className="text-sm font-medium truncate"
                        style={{ color: classColor }}
                    >
                        {char.player.name}
                    </span>
                </div>
                {char.main && (
                    <Crown
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: classColor }}
                    />
                )}
            </div>
        )
    }

    // Render a helper placeholder
    const renderHelperCell = (role: string, index: number) => {
        return (
            <div
                key={`helper-${role}-${s(index)}`}
                className="relative px-3 py-2 rounded-lg border border-dashed border-border/40 bg-muted/20"
            >
                <span className="text-sm font-medium text-muted-foreground/60">
                    {role} Helper
                </span>
            </div>
        )
    }

    return (
        <GlassCard
            interactive
            padding="lg"
            className={cn(
                "flex flex-col gap-4 transition-colors",
                isDragOver && "border-primary/50 bg-primary/5"
            )}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Header */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Run {runIndex + 1}</h3>
                    {totalHelpers > 0 && (
                        <span className="text-xs text-orange-400 font-medium">
                            {totalHelpers} helper{totalHelpers !== 1 ? "s" : ""} needed
                        </span>
                    )}
                </div>

                {/* Role stats */}
                <div className="flex flex-wrap gap-2">
                    <StatBadge
                        variant={run.stats.tanks < 2 ? "warning" : "default"}
                        icon={<Shield className="w-3.5 h-3.5" />}
                        label="Tanks"
                        value={run.stats.tanks}
                    />
                    <StatBadge
                        variant={run.stats.healers < 4 ? "warning" : "success"}
                        icon={<Heart className="w-3.5 h-3.5" />}
                        label="Healers"
                        value={run.stats.healers}
                    />
                    <StatBadge
                        variant="info"
                        icon={<Swords className="w-3.5 h-3.5" />}
                        label="DPS"
                        value={run.stats.dps}
                    />
                </div>

                {/* Armor type distribution */}
                <div className="flex flex-wrap gap-2">
                    {(["Cloth", "Leather", "Mail", "Plate"] as const).map((armorType) => {
                        const count = run.stats.armorTypes[armorType] ?? 0
                        if (count === 0) {
                            return null
                        }

                        return (
                            <div
                                key={armorType}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/30 border border-border/40"
                            >
                                <span className="text-xs font-medium text-muted-foreground">
                                    {armorType}
                                </span>
                                <span className="text-xs font-bold text-foreground">
                                    {count}
                                </span>
                            </div>
                        )
                    })}
                </div>

                {/* Warnings */}
                {run.warnings.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                        {run.warnings.map((warning, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30"
                            >
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                                <span className="text-xs text-orange-400">{warning}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Characters by role - Column layout */}
            <div className="flex flex-col gap-4">
                {/* Tanks section */}
                {tanks.length > 0 || tankHelpers > 0 ? (
                    <div className="flex flex-col gap-2">
                        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5" />
                            Tanks
                        </div>
                        <div className="flex flex-col gap-2">
                            {tanks.map((char) =>
                                renderPlayerCell(
                                    char,
                                    run.characters.findIndex(
                                        (c) => c.character.id === char.character.id
                                    )
                                )
                            )}
                            {Array.from({ length: tankHelpers }, (_, i) =>
                                renderHelperCell("Tank", i)
                            )}
                        </div>
                    </div>
                ) : null}

                {/* Healers section */}
                {healers.length > 0 || healerHelpers > 0 ? (
                    <div className="flex flex-col gap-2">
                        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Heart className="w-3.5 h-3.5" />
                            Healers
                        </div>
                        <div className="flex flex-col gap-2">
                            {healers.map((char) =>
                                renderPlayerCell(
                                    char,
                                    run.characters.findIndex(
                                        (c) => c.character.id === char.character.id
                                    )
                                )
                            )}
                            {Array.from({ length: healerHelpers }, (_, i) =>
                                renderHelperCell("Healer", i)
                            )}
                        </div>
                    </div>
                ) : null}

                {/* DPS section */}
                {dps.length > 0 || dpsHelpers > 0 ? (
                    <div className="flex flex-col gap-2">
                        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Swords className="w-3.5 h-3.5" />
                            DPS
                        </div>
                        <div className="flex flex-col gap-2">
                            {dps.map((char) =>
                                renderPlayerCell(
                                    char,
                                    run.characters.findIndex(
                                        (c) => c.character.id === char.character.id
                                    )
                                )
                            )}
                            {Array.from({ length: dpsHelpers }, (_, i) =>
                                renderHelperCell("DPS", i)
                            )}
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Total count */}
            <div className="text-sm text-muted-foreground text-center pt-2 border-t border-border/40">
                {run.characters.length} player{run.characters.length !== 1 ? "s" : ""}
            </div>
        </GlassCard>
    )
}

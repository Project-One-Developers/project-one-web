"use client"

import { Calendar, ChevronDown, Gem, Users } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { s } from "@/shared/libs/string-utils"
import type { RaidSessionWithSummary } from "@/shared/models/raid-session.models"
import SessionCard from "./session-card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import { GlassCard } from "./ui/glass-card"

type CollapsibleSessionSelectorProps = {
    sessions: RaidSessionWithSummary[]
    selectedSessions: Set<string>
    onToggleSession: (sessionId: string) => void
    onEditRoster: (sessionId: string) => void
    onLootImport: (sessionId: string) => void
    showAllSessions: boolean
    onToggleShowAll: () => void
    className?: string
}

export function CollapsibleSessionSelector({
    sessions,
    selectedSessions,
    onToggleSession,
    onEditRoster,
    onLootImport,
    showAllSessions,
    onToggleShowAll,
    className,
}: CollapsibleSessionSelectorProps) {
    // Start collapsed if sessions are pre-selected (e.g., from URL param)
    const [isExpanded, setIsExpanded] = useState(true)

    // Auto-collapse when a session is selected (via the toggle handler)
    const handleToggleSession = (sessionId: string) => {
        onToggleSession(sessionId)
        // Collapse after selection if we're going from 0 to 1 selected
        if (selectedSessions.size === 0) {
            setIsExpanded(false)
        }
    }

    const visibleSessions = showAllSessions ? sessions : sessions.slice(0, 5)

    // Calculate aggregated stats for selected sessions
    const selectedStats = sessions
        .filter((s) => selectedSessions.has(s.id))
        .reduce(
            (acc, session) => ({
                rosterCount: acc.rosterCount + session.rosterCount,
                lootCount: acc.lootCount + session.lootCount,
            }),
            { rosterCount: 0, lootCount: 0 }
        )

    return (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <GlassCard padding="none" className={cn("overflow-hidden", className)}>
                {/* Collapsed header bar */}
                <CollapsibleTrigger asChild>
                    <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-card/60 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                                {selectedSessions.size > 0 ? (
                                    <>
                                        {s(selectedSessions.size)} session
                                        {selectedSessions.size !== 1 ? "s" : ""} selected
                                    </>
                                ) : (
                                    "Select sessions"
                                )}
                            </span>

                            {/* Aggregated stats when collapsed and sessions selected */}
                            {!isExpanded && selectedSessions.size > 0 && (
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="text-muted-foreground/60">•</span>
                                    <div className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        <span>{selectedStats.rosterCount}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Gem className="w-3 h-3" />
                                        <span>{selectedStats.lootCount}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <ChevronDown
                            className={cn(
                                "w-4 h-4 text-muted-foreground transition-transform duration-200",
                                isExpanded && "rotate-180"
                            )}
                        />
                    </button>
                </CollapsibleTrigger>

                {/* Expanded content with session cards */}
                <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                    <div className="px-4 pb-4 pt-2 border-t border-border/30">
                        {/* Show all toggle */}
                        {sessions.length > 5 && (
                            <div className="flex justify-end mb-3">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onToggleShowAll()
                                    }}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showAllSessions
                                        ? "Show less"
                                        : `Show all (${s(sessions.length)})`}
                                </button>
                            </div>
                        )}

                        {/* Session cards grid */}
                        <div className="flex flex-wrap gap-3">
                            {visibleSessions.map((session) => (
                                <SessionCard
                                    key={session.id}
                                    session={session}
                                    isSelected={selectedSessions.has(session.id)}
                                    showActions={true}
                                    onClick={() => {
                                        handleToggleSession(session.id)
                                    }}
                                    onEditRoster={onEditRoster}
                                    onLootImport={onLootImport}
                                />
                            ))}
                        </div>
                    </div>
                </CollapsibleContent>
            </GlassCard>
        </Collapsible>
    )
}

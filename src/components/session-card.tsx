"use client"

import { Calendar, ExternalLink, Gem, Package, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import type { MouseEvent } from "react"
import { cn } from "@/lib/utils"
import {
    formatUnixTimestampForDisplay,
    unixTimestampToWowWeek,
} from "@/shared/libs/date-utils"
import type { RaidSessionWithSummary } from "@/shared/models/raid-session.models"
import { Button } from "./ui/button"
import { GlassCard } from "./ui/glass-card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

type SessionCardProps = {
    session: RaidSessionWithSummary
    className?: string
    showActions?: boolean
    isSelected?: boolean
    onClick?: () => void
    onEditRoster?: (sessionId: string) => void
    onLootImport?: (sessionId: string) => void
}

const SessionCard = ({
    session,
    className,
    showActions = false,
    isSelected = false,
    onClick,
    onEditRoster,
    onLootImport,
}: SessionCardProps) => {
    const router = useRouter()

    const handleCardClick = () => {
        if (onClick) {
            onClick()
        }
    }

    const handleGoToSession = (e: MouseEvent) => {
        e.stopPropagation()
        router.push(`/raid-session/${session.id}`)
    }

    const handleEditRoster = (e: MouseEvent) => {
        e.stopPropagation()
        onEditRoster?.(session.id)
    }

    const handleLootImport = (e: MouseEvent) => {
        e.stopPropagation()
        onLootImport?.(session.id)
    }

    return (
        <GlassCard
            interactive
            padding="none"
            className={cn(
                "group flex flex-col w-52 cursor-pointer",
                isSelected && "ring-1 ring-primary border-primary",
                className
            )}
            onClick={handleCardClick}
        >
            <div className="px-3 pt-3 pb-2">
                {/* Title */}
                <h3
                    className="text-sm font-medium text-foreground truncate mb-1.5"
                    title={session.name}
                >
                    {session.name}
                </h3>

                {/* Date and week */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatUnixTimestampForDisplay(session.raidDate)}</span>
                    </div>
                    <span className="text-primary/80 font-medium">
                        W{unixTimestampToWowWeek(session.raidDate)}
                    </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{session.rosterCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Gem className="w-3 h-3" />
                        <span>{session.lootCount}</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            {showActions && (
                <div className="border-t border-border/30 px-1 py-1">
                    <TooltipProvider delayDuration={200}>
                        <div className="flex justify-around">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                        onClick={handleGoToSession}
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                    View session
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                        onClick={handleEditRoster}
                                    >
                                        <Users className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                    Edit roster
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                        onClick={handleLootImport}
                                    >
                                        <Package className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                    Import loot
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </TooltipProvider>
                </div>
            )}
        </GlassCard>
    )
}

export default SessionCard

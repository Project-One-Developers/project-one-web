"use client"

import { StickyNote, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LootWithAssigned } from "@/shared/models/loot.models"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { WowGearIcon } from "./wow/wow-gear-icon"

type SelectedLootHeaderProps = {
    loot: LootWithAssigned
    itemNote: string | null | undefined
    showAlts: boolean
    onToggleShowAlts: () => void
}

export function SelectedLootHeader({
    loot,
    itemNote,
    showAlts,
    onToggleShowAlts,
}: SelectedLootHeaderProps) {
    const hasNote = itemNote && itemNote.trim() !== ""

    return (
        <div className="flex flex-row justify-center items-center p-2 rounded-lg gap-4">
            <WowGearIcon
                gearItem={loot.gearItem}
                showSlot={true}
                showTiersetLine={true}
                showExtendedInfo={true}
                showArmorType={true}
                showRoleIcons={true}
                iconClassName="h-12 w-12"
            />

            {/* Item Note Badge */}
            {hasNote && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 max-w-xs cursor-help bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-full text-xs">
                            <StickyNote className="h-3 w-3" />
                            <span className="truncate">
                                {itemNote.length > 20
                                    ? `${itemNote.substring(0, 20)}...`
                                    : itemNote}
                            </span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm">
                        <div className="whitespace-pre-wrap wrap-break-word">
                            <strong className="text-blue-400">Item Note:</strong>
                            <br />
                            {itemNote}
                        </div>
                    </TooltipContent>
                </Tooltip>
            )}

            {/* Show Alts Toggle */}
            <button
                type="button"
                onClick={onToggleShowAlts}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                    showAlts
                        ? "bg-primary/20 text-primary border border-primary/50"
                        : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                )}
            >
                <Users className="h-3 w-3" />
                {showAlts ? "All Characters" : "Mains Only"}
            </button>
        </div>
    )
}

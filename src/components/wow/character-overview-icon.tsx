"use client"

import { Crown } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { type JSX } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { classIcon } from "@/lib/wow-icon"
import type { CharacterSummary, CharacterSummaryCompact } from "@/shared/types"
import { WowCharacterLink } from "./wow-character-links"

type CharacterSummaryType = CharacterSummary | CharacterSummaryCompact

const CharacterTooltip = ({
    summary,
    isLowItemLevel,
}: {
    summary: CharacterSummaryType
    isLowItemLevel: boolean
}) => (
    <div className="flex flex-col gap-2 min-w-45">
        <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
                {summary.character.name}
            </span>
            {summary.character.main && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                    MAIN
                </span>
            )}
        </div>
        <div className="text-xs text-muted-foreground">
            {summary.character.realm.replaceAll("-", " ")}
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Item Level</span>
            <span
                className={cn(
                    "font-bold text-sm",
                    isLowItemLevel ? "text-orange-400" : "text-blue-400"
                )}
            >
                {summary.itemLevel}
            </span>
            {isLowItemLevel && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                    Low
                </span>
            )}
        </div>
        <div className="flex flex-row gap-2 pt-2">
            <WowCharacterLink character={summary.character} site="raiderio" />
            <WowCharacterLink character={summary.character} site="warcraftlogs" />
            <WowCharacterLink character={summary.character} site="armory" />
        </div>
    </div>
)

export const CharacterOverviewIcon = ({
    charsWithSummary,
    className,
    isLowItemLevel,
}: {
    charsWithSummary: CharacterSummaryType[]
    className?: string
    isLowItemLevel?: (itemLevel: string) => boolean
}): JSX.Element => {
    const router = useRouter()

    const sortedChars = charsWithSummary.sort(
        (a, b) => (b.character.main ? 1 : 0) - (a.character.main ? 1 : 0)
    )

    const totalChars = sortedChars.length

    return (
        <div className={cn("flex items-end gap-1", className)}>
            {sortedChars.map((item, index) => {
                const isLow = isLowItemLevel ? isLowItemLevel(item.itemLevel) : false
                const isMain = item.character.main
                const iconSize = isMain ? 52 : 40
                // Main (first) should be on top, then descending z-index for alts
                const zIndex = totalChars - index

                return (
                    <Tooltip key={item.character.id}>
                        <TooltipTrigger asChild>
                            <button
                                style={{ zIndex }}
                                className={cn(
                                    "relative flex flex-col items-center cursor-pointer transition-all duration-200 hover:z-50!",
                                    index > 0 && "-ml-2",
                                    "hover:scale-110"
                                )}
                                onClick={() => {
                                    router.push(`/roster/${item.character.id}`)
                                }}
                            >
                                {/* Main indicator */}
                                {isMain && (
                                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10">
                                        <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    </div>
                                )}

                                {/* Character Icon */}
                                <div
                                    className={cn(
                                        "relative rounded-xl overflow-hidden border-2 transition-all",
                                        isMain
                                            ? "border-amber-500/60 shadow-md shadow-amber-500/20"
                                            : isLow
                                              ? "border-orange-500/50"
                                              : "border-border/50"
                                    )}
                                >
                                    <Image
                                        height={iconSize}
                                        width={iconSize}
                                        src={classIcon.get(item.character.class) ?? ""}
                                        alt={item.character.class}
                                        className="object-cover"
                                    />

                                    {/* Item Level Badge */}
                                    <div
                                        className={cn(
                                            "absolute bottom-0 inset-x-0 text-center py-0.5 text-[10px] font-bold backdrop-blur-sm",
                                            isLow
                                                ? "bg-orange-500/80 text-white"
                                                : "bg-black/60 text-white"
                                        )}
                                    >
                                        {Math.round(parseInt(item.itemLevel)) || "?"}
                                    </div>
                                </div>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent
                            side="top"
                            className="bg-popover/95 backdrop-blur-sm"
                        >
                            <CharacterTooltip summary={item} isLowItemLevel={isLow} />
                        </TooltipContent>
                    </Tooltip>
                )
            })}
        </div>
    )
}

"use client"

import { getDpsHumanReadable } from "@/lib/utils"
import type { CharAssignmentHighlights } from "@/shared/models/loot.models"
import { tierSetBonusSchema } from "@/shared/models/wow.models"
import type { WowSpec } from "@/shared/types"
import { HighlightBadge } from "./ui/highlight-badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { WowSpecIcon } from "./wow/wow-spec-icon"

type CharacterHighlightsProps = {
    highlights: CharAssignmentHighlights
    bisForSpec: WowSpec[]
}

export function CharacterHighlights({
    highlights,
    bisForSpec,
}: CharacterHighlightsProps) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {highlights.dpsGain > 0 && (
                <HighlightBadge variant="dps">
                    +{getDpsHumanReadable(highlights.dpsGain)}
                </HighlightBadge>
            )}

            {highlights.gearIsBis && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span>
                            <HighlightBadge variant="bis">BIS</HighlightBadge>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="flex flex-col gap-1">
                            {bisForSpec.map((spec) => (
                                <div key={spec.id} className="flex items-center gap-2">
                                    <WowSpecIcon
                                        specId={spec.id}
                                        className="h-5 w-5 rounded border border-background"
                                    />
                                    <span>{spec.name}</span>
                                </div>
                            ))}
                        </div>
                    </TooltipContent>
                </Tooltip>
            )}

            {highlights.lootEnableTiersetBonus === tierSetBonusSchema.enum["2p"] && (
                <HighlightBadge variant="tierset">2P</HighlightBadge>
            )}

            {highlights.lootEnableTiersetBonus === tierSetBonusSchema.enum["4p"] && (
                <HighlightBadge variant="tierset">4P</HighlightBadge>
            )}

            {(highlights.ilvlDiff > 0 || highlights.isTrackUpgrade) && (
                <HighlightBadge variant="upgrade">SLOT</HighlightBadge>
            )}

            {highlights.alreadyGotIt && (
                <HighlightBadge variant="owned">OWNED</HighlightBadge>
            )}
        </div>
    )
}

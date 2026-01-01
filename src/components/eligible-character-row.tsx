"use client"

import { AlertTriangle, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GearItem } from "@/shared/models/item.models"
import type { LootWithAssigned } from "@/shared/models/loot.models"
import { DROPTIMIZER_WARN, type CharAssignmentInfo } from "@/shared/types"
import { CharacterHighlights } from "./character-highlights"
import { DroptimizerUpgradeForItemEquipped } from "./droptimizer-upgrade-for-item"
import { HighlightBadge } from "./ui/highlight-badge"
import { TableCell, TableRow } from "./ui/table"
import { TiersetInfo } from "./wow/tierset-info"
import { WowClassIcon } from "./wow/wow-class-icon"
import { WowGearIcon } from "./wow/wow-gear-icon"

type EligibleCharacterRowProps = {
    charInfo: CharAssignmentInfo
    isAssigned: boolean
    showTiersetInfo: boolean
    showHighestInSlot: boolean
    otherAssignedLoots: LootWithAssigned[]
    vaultItems: GearItem[]
    onAssign: () => void
    onUnassign: () => void
}

export function EligibleCharacterRow({
    charInfo,
    isAssigned,
    showTiersetInfo,
    showHighestInSlot,
    otherAssignedLoots,
    vaultItems,
    onAssign,
    onUnassign,
}: EligibleCharacterRowProps) {
    const handleClick = () => {
        if (isAssigned) {
            onUnassign()
        } else {
            onAssign()
        }
    }

    return (
        <TableRow
            className={cn(
                "cursor-pointer hover:bg-muted/50",
                isAssigned && "bg-green-500/10"
            )}
            onClick={handleClick}
        >
            {/* Name Cell */}
            <TableCell>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <WowClassIcon
                            wowClassName={charInfo.character.class}
                            className="h-8 w-8 border-2 border-background rounded-lg"
                        />
                        {isAssigned && (
                            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="font-semibold text-foreground">
                            {charInfo.character.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Score: {charInfo.highlights.score}
                        </p>
                    </div>
                </div>
            </TableCell>

            {/* Highlights Cell */}
            <TableCell>
                <CharacterHighlights
                    highlights={charInfo.highlights}
                    bisForSpec={charInfo.bisForSpec}
                />
            </TableCell>

            {/* Droptimizer Cell */}
            <TableCell>
                <div className="flex flex-col gap-2">
                    {charInfo.droptimizers.map((dropt) => (
                        <DroptimizerUpgradeForItemEquipped
                            key={dropt.droptimizer.url}
                            upgrade={dropt.upgrade}
                            droptimizer={dropt.droptimizer}
                            itemEquipped={dropt.itemEquipped}
                        />
                    ))}
                    {charInfo.warnDroptimizer === DROPTIMIZER_WARN.NotImported && (
                        <HighlightBadge
                            variant="warning"
                            icon={<AlertTriangle className="h-3 w-3" />}
                        >
                            MISSING
                        </HighlightBadge>
                    )}
                </div>
            </TableCell>

            {/* Highest in Slot Cell */}
            {showHighestInSlot && (
                <TableCell>
                    <div className="flex items-start justify-center gap-1 pt-4">
                        {charInfo.bestItemsInSlot.map((item) => (
                            <WowGearIcon
                                key={item.item.id}
                                gearItem={item}
                                showTiersetLine={true}
                            />
                        ))}
                    </div>
                </TableCell>
            )}

            {/* Other Assignment Cell */}
            <TableCell>
                <div className="flex items-start justify-center gap-1 pt-4">
                    {otherAssignedLoots.map((loot) => (
                        <WowGearIcon key={loot.id} gearItem={loot.gearItem} />
                    ))}
                </div>
            </TableCell>

            {/* Tierset & Catalyst Cells */}
            {showTiersetInfo && (
                <>
                    <TableCell>
                        <TiersetInfo
                            tierset={charInfo.tierset}
                            className="justify-center"
                        />
                    </TableCell>
                    <TableCell className="text-center">
                        <span className="text-muted-foreground">
                            {charInfo.catalystCharge}
                        </span>
                    </TableCell>
                </>
            )}

            {/* Vault Cell */}
            <TableCell>
                <div className="flex items-start justify-center gap-1 pt-4">
                    {vaultItems.map((gear) => (
                        <WowGearIcon key={gear.item.id} gearItem={gear} />
                    ))}
                </div>
            </TableCell>
        </TableRow>
    )
}

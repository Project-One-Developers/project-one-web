"use client"

import { useMemo, useState, type JSX } from "react"
import { toast } from "sonner"
import { useItemNote } from "@/lib/queries/items"
import {
    useAssignLoot,
    useLootAssignmentInfo,
    useUnassignLoot,
} from "@/lib/queries/loots"
import type { LootWithAssigned } from "@/shared/models/loot.models"
import type { CharAssignmentInfo } from "@/shared/types"
import { ITEM_SLOTS_KEY_TIERSET } from "@/shared/wow.consts"
import { EligibleCharacterRow } from "./eligible-character-row"
import { SelectedLootHeader } from "./selected-loot-header"
import { LoadingSpinner } from "./ui/loading-spinner"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "./ui/table"

type LootsEligibleCharsProps = {
    selectedLoot: LootWithAssigned
    setSelectedLoot: (loot: LootWithAssigned) => void
    allLoots: LootWithAssigned[]
}

const sortEligibleCharacters = (a: CharAssignmentInfo, b: CharAssignmentInfo) => {
    if (b.highlights.score !== a.highlights.score) {
        return b.highlights.score - a.highlights.score
    }
    if (b.highlights.gearIsBis !== a.highlights.gearIsBis) {
        return b.highlights.gearIsBis ? 1 : -1
    }
    if (b.highlights.isTrackUpgrade !== a.highlights.isTrackUpgrade) {
        return b.highlights.isTrackUpgrade ? 1 : -1
    }
    return a.highlights.alreadyGotIt ? 1 : -1
}

export default function LootsEligibleChars({
    selectedLoot,
    setSelectedLoot,
    allLoots,
}: LootsEligibleCharsProps): JSX.Element {
    const [showAlts, setShowAlts] = useState(false)

    const lootAssignmentInfoQuery = useLootAssignmentInfo(selectedLoot.id)
    const itemNoteQuery = useItemNote(selectedLoot.gearItem.item.id)
    const assignLootMutation = useAssignLoot()
    const unassignLootMutation = useUnassignLoot()

    const eligibleCharacters = useMemo(() => {
        if (!lootAssignmentInfoQuery.data) {
            return []
        }
        return lootAssignmentInfoQuery.data.eligible
            .filter(({ character }) => showAlts || character.main)
            .sort(sortEligibleCharacters)
    }, [lootAssignmentInfoQuery.data, showAlts])

    const slotKey = selectedLoot.gearItem.item.slotKey
    const showTiersetInfo =
        slotKey === "omni" || ITEM_SLOTS_KEY_TIERSET.some((s) => s === slotKey)
    const showHighestInSlot = slotKey !== "omni"

    const handleAssign = (charInfo: CharAssignmentInfo) => {
        const previousSelectedLoot = { ...selectedLoot }
        setSelectedLoot({
            ...selectedLoot,
            assignedCharacterId: charInfo.character.id,
        })

        assignLootMutation.mutate(
            {
                charId: charInfo.character.id,
                lootId: selectedLoot.id,
                highlights: charInfo.highlights,
                raidSessionId: selectedLoot.raidSessionId,
            },
            {
                onError: (error) => {
                    setSelectedLoot(previousSelectedLoot)
                    toast.error(`Unable to assign loot. Error: ${error.message}`)
                },
            }
        )
    }

    const handleUnassign = () => {
        const previousSelectedLoot = { ...selectedLoot }
        setSelectedLoot({
            ...selectedLoot,
            assignedCharacterId: null,
        })

        unassignLootMutation.mutate(
            { lootId: selectedLoot.id, raidSessionId: selectedLoot.raidSessionId },
            {
                onError: (error) => {
                    setSelectedLoot(previousSelectedLoot)
                    toast.error(`Unable to unassign loot. Error: ${error.message}`)
                },
            }
        )
    }

    if (lootAssignmentInfoQuery.isLoading) {
        return <LoadingSpinner size="default" text="Loading eligible characters..." />
    }

    return (
        <div className="flex flex-col gap-4">
            <SelectedLootHeader
                loot={selectedLoot}
                itemNote={itemNoteQuery.data?.note}
                showAlts={showAlts}
                onToggleShowAlts={() => {
                    setShowAlts(!showAlts)
                }}
            />

            <Table className="w-full">
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="text-center">Name</TableHead>
                        <TableHead className="text-center">Highlights</TableHead>
                        <TableHead className="text-center">Droptimizer</TableHead>
                        {showHighestInSlot && (
                            <TableHead className="text-center">Highest</TableHead>
                        )}
                        <TableHead className="text-center">Other Assignment</TableHead>
                        {showTiersetInfo && (
                            <>
                                <TableHead className="text-center">Tierset</TableHead>
                                <TableHead className="text-center">Catalyst</TableHead>
                            </>
                        )}
                        <TableHead className="text-center">Vault</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {eligibleCharacters.map((charInfo) => {
                        const otherAssignedLoots = allLoots.filter(
                            (loot) =>
                                loot.id !== selectedLoot.id &&
                                loot.assignedCharacterId === charInfo.character.id &&
                                loot.gearItem.item.slotKey === slotKey
                        )
                        const vaultItems = charInfo.weeklyChest.filter(
                            (vault) => vault.item.slotKey === slotKey
                        )

                        return (
                            <EligibleCharacterRow
                                key={charInfo.character.id}
                                charInfo={charInfo}
                                isAssigned={
                                    selectedLoot.assignedCharacterId ===
                                    charInfo.character.id
                                }
                                showTiersetInfo={showTiersetInfo}
                                showHighestInSlot={showHighestInSlot}
                                otherAssignedLoots={otherAssignedLoots}
                                vaultItems={vaultItems}
                                onAssign={() => {
                                    handleAssign(charInfo)
                                }}
                                onUnassign={handleUnassign}
                            />
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}

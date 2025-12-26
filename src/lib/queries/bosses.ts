"use client"

import { getBossesAction, getRaidLootTableAction } from "@/actions/bosses"
import { getRosterProgressionAction } from "@/actions/raiderio"
import { CURRENT_RAID_ID } from "@/shared/consts/wow.consts"
import type { CharacterWithProgression } from "@/shared/types/types"
import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "./keys"

export function useBosses(raidId: number = CURRENT_RAID_ID) {
    return useQuery({
        queryKey: [queryKeys.bosses, raidId],
        queryFn: () => getBossesAction(raidId),
    })
}

export function useRaidLootTable(raidId: number = CURRENT_RAID_ID) {
    return useQuery({
        queryKey: [queryKeys.bosses, "lootTable", raidId],
        queryFn: () => getRaidLootTableAction(raidId),
    })
}

export function useRosterProgression(showMains: boolean, showAlts: boolean) {
    return useQuery({
        queryKey: [queryKeys.raidProgression, showMains, showAlts],
        queryFn: async (): Promise<CharacterWithProgression[]> => {
            // Convert the boolean filter states to the numeric parameter
            let filterParam = 0 // default: all characters
            if (showMains && !showAlts) {
                filterParam = 1 // only mains
            } else if (!showMains && showAlts) {
                filterParam = 2 // only alts
            }
            // If both showMains and showAlts are true, or both are false, use 0 (all characters)

            const result = await getRosterProgressionAction(filterParam)
            return result as CharacterWithProgression[]
        },
    })
}

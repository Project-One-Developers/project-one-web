"use client"

import { skipToken, useQuery } from "@tanstack/react-query"
import { getRosterProgression } from "@/actions/blizzard"
import { getBosses, getRaidLootTable } from "@/actions/bosses"
import { CURRENT_RAID_ID } from "@/shared/wow.consts"
import { queryKeys } from "./keys"

export function useBosses(raidId: number = CURRENT_RAID_ID) {
    return useQuery({
        queryKey: [queryKeys.bosses, raidId],
        queryFn: () => getBosses(raidId),
        staleTime: 3600000, // 1 hour - boss data is static per patch
    })
}

export function useRaidLootTable(raidId: number = CURRENT_RAID_ID) {
    return useQuery({
        queryKey: [queryKeys.bosses, "lootTable", raidId],
        queryFn: () => getRaidLootTable(raidId),
        staleTime: 3600000, // 1 hour - loot table is static per patch
    })
}

export function useRosterProgression(raidSlug: string | undefined) {
    return useQuery({
        queryKey: [queryKeys.raidProgression, raidSlug],
        staleTime: 60000, // 1 minute - progression updates infrequently
        queryFn: raidSlug ? () => getRosterProgression(raidSlug) : skipToken,
    })
}

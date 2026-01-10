"use client"

import { skipToken, useQuery } from "@tanstack/react-query"
import { getRosterProgression } from "@/actions/blizzard"
import { getBosses, getRaidLootTable } from "@/actions/bosses"
import { unwrap } from "@/lib/errors"
import { CURRENT_RAID_IDS } from "@/shared/libs/season-config"
import { queryKeys } from "./keys"

export function useBosses() {
    return useQuery({
        queryKey: [queryKeys.bosses, "seasonal", CURRENT_RAID_IDS],
        queryFn: () => unwrap(getBosses()),
        staleTime: 3600000, // 1 hour - boss data is static per patch
    })
}

export function useRaidLootTable() {
    return useQuery({
        queryKey: [queryKeys.bosses, "lootTable", "seasonal", CURRENT_RAID_IDS],
        queryFn: () => unwrap(getRaidLootTable()),
        staleTime: 3600000, // 1 hour - loot table is static per patch
    })
}

export function useRosterProgression(raidSlug: string | undefined) {
    return useQuery({
        queryKey: [queryKeys.raidProgression, raidSlug],
        staleTime: 60000, // 1 minute - progression updates infrequently
        queryFn: raidSlug ? () => unwrap(getRosterProgression(raidSlug)) : skipToken,
    })
}

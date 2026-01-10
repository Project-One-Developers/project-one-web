"use client"

import { useQuery } from "@tanstack/react-query"
import { getLootRecapBySession, getRaidSessionsForRecap } from "@/actions/loot-recap"
import { unwrap } from "@/lib/errors"
import { queryKeys } from "./keys"

export function useRaidSessionsForRecap() {
    return useQuery({
        queryKey: [queryKeys.lootRecapSessions],
        queryFn: () => unwrap(getRaidSessionsForRecap()),
        staleTime: 30_000, // 30 seconds
    })
}

export function useLootRecap(sessionId: string | undefined) {
    return useQuery({
        queryKey: [queryKeys.lootRecap, sessionId],
        queryFn: () => {
            if (!sessionId) {
                throw new Error("No session ID provided")
            }
            return unwrap(getLootRecapBySession(sessionId))
        },
        enabled: !!sessionId,
        staleTime: 30_000, // 30 seconds
    })
}

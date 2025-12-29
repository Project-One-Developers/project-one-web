"use client"

import { useQuery } from "@tanstack/react-query"
import { getRosterSummary } from "@/actions/summary"
import { queryKeys } from "./keys"

export function useRosterSummary() {
    return useQuery({
        queryKey: [queryKeys.rosterSummary],
        queryFn: () => getRosterSummary(),
    })
}

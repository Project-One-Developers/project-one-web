"use client"

import { useQuery } from "@tanstack/react-query"
import { getRecentCronLogs } from "@/actions/cron-logs"
import { queryKeys } from "./keys"

export function useCronLogs(limit = 3) {
    return useQuery({
        queryKey: [queryKeys.cronLogs, limit],
        queryFn: () => getRecentCronLogs(limit),
        staleTime: 60000,
    })
}

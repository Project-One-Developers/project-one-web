"use client"

import { useQuery } from "@tanstack/react-query"
import { getPlayerMountStatuses } from "@/actions/mount-tracker"
import { unwrap } from "@/lib/errors"
import { queryKeys } from "./keys"

export function useMountTracker() {
    return useQuery({
        queryKey: [queryKeys.mountTracker],
        queryFn: () => unwrap(getPlayerMountStatuses()),
        staleTime: 60_000, // 1 minute
    })
}

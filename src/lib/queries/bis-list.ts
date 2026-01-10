"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getBisList, updateItemBisSpec } from "@/actions/bis-list"
import { unwrap } from "@/lib/errors"
import { queryKeys } from "./keys"

export function useBisList() {
    return useQuery({
        queryKey: [queryKeys.bisList],
        queryFn: () => unwrap(getBisList()),
        staleTime: 60000, // 1 minute - user-editable but not frequent
    })
}

export function useUpdateItemBisSpecs() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ itemId, specIds }: { itemId: number; specIds: number[] }) =>
            unwrap(updateItemBisSpec(itemId, specIds)),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.bisList] })
        },
    })
}

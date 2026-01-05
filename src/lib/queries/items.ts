"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getItemById, searchItems, setItemNote } from "@/actions/items"
import { queryKeys } from "./keys"

// ============== QUERIES ==============

export function useItem(id: number | undefined) {
    return useQuery({
        queryKey: [queryKeys.items, id],
        queryFn: () => {
            if (!id) {
                throw new Error("No item id provided")
            }
            return getItemById(id)
        },
        enabled: !!id,
    })
}

export function useSearchItems(searchTerm: string, limit = 20) {
    return useQuery({
        queryKey: [queryKeys.items, "search", searchTerm, limit],
        queryFn: () => searchItems(searchTerm, limit),
        enabled: searchTerm.length >= 2,
        staleTime: 3600000, // 1 hour - item data is static per patch
    })
}

// ============== MUTATIONS ==============

export function useSetItemNote() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, note }: { id: number; note: string }) => setItemNote(id, note),
        onSuccess: (_, vars) => {
            // Invalidate item queries so the updated note is reflected
            void queryClient.invalidateQueries({ queryKey: [queryKeys.items, vars.id] })
            void queryClient.invalidateQueries({ queryKey: [queryKeys.bosses] })
        },
    })
}

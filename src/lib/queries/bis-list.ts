"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { getBisList, updateItemBisSpec } from "@/actions/bis-list"
import { queryKeys } from "./keys"

export function useBisList() {
    return useQuery({
        queryKey: [queryKeys.bisList],
        queryFn: () => getBisList(),
        staleTime: 60000, // 1 minute - user-editable but not frequent
    })
}

export function useUpdateItemBisSpecs() {
    const queryClient = useQueryClient()

    return useAction(updateItemBisSpec, {
        onSuccess: () => {
            toast.success("BiS specs updated")
            void queryClient.invalidateQueries({ queryKey: [queryKeys.bisList] })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to update BiS specs")
        },
    })
}

"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
    addSimC,
    addSimulationFromUrl,
    deleteDroptimizer,
    deleteSimulationsOlderThan,
    getDroptimizerLatestList,
    syncDroptimizersFromDiscord,
} from "@/actions/droptimizer"
import { queryKeys } from "./keys"

export function useLatestDroptimizers() {
    return useQuery({
        queryKey: [queryKeys.droptimizers, "latest"],
        queryFn: () => getDroptimizerLatestList(),
        staleTime: 30000,
    })
}

export function useDeleteDroptimizer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => deleteDroptimizer(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
    })
}

export function useAddSimC() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (simcData: string) => addSimC(simcData),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
    })
}

export function useAddSimulationFromUrl() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (url: string) => addSimulationFromUrl(url),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
    })
}

type DurationInput = { days?: number; hours?: number }

export function useSyncDroptimizersFromDiscord() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (lookback: DurationInput) => syncDroptimizersFromDiscord(lookback),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
    })
}

export function useDeleteSimulationsOlderThan() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (lookback: DurationInput) => deleteSimulationsOlderThan(lookback),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
    })
}

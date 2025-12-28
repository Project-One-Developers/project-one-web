"use client"

import {
    addSimC,
    addSimulationFromUrl,
    deleteDroptimizer,
    deleteSimulationsOlderThanHours,
    getDroptimizerLastByCharAndDiff,
    getDroptimizerLatestList,
    getDroptimizerList,
    syncDroptimizersFromDiscord,
} from "@/actions/droptimizer"
import type { WowRaidDifficulty } from "@/shared/models/wow.model"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "./keys"

export function useDroptimizers() {
    return useQuery({
        queryKey: [queryKeys.droptimizers],
        queryFn: () => getDroptimizerList(),
        staleTime: 30000,
    })
}

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
        mutationFn: (url: string) => deleteDroptimizer(url),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
    })
}

export function useDroptimizerLastByCharAndDiff(
    charName: string | undefined,
    charRealm: string | undefined,
    raidDiff: WowRaidDifficulty | undefined
) {
    return useQuery({
        queryKey: [
            queryKeys.droptimizers,
            "lastByCharAndDiff",
            charName,
            charRealm,
            raidDiff,
        ],
        queryFn: () => {
            if (!charName || !charRealm || !raidDiff) {
                throw new Error("Missing parameters")
            }
            return getDroptimizerLastByCharAndDiff(charName, charRealm, raidDiff)
        },
        enabled: !!charName && !!charRealm && !!raidDiff,
        staleTime: 30000,
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

export function useSyncDroptimizersFromDiscord() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (hours: number) => syncDroptimizersFromDiscord(hours),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
    })
}

export function useDeleteSimulationsOlderThanHours() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (hours: number) => deleteSimulationsOlderThanHours(hours),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
    })
}

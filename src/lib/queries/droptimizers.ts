"use client"

import {
    addSimCAction,
    addSimulationFromUrlAction,
    deleteDroptimizerAction,
    deleteSimulationsOlderThanHoursAction,
    getDroptimizerLastByCharAndDiffAction,
    getDroptimizerLatestListAction,
    getDroptimizerListAction,
    syncDroptimizersFromDiscordAction,
} from "@/actions/droptimizer"
import type { WowRaidDifficulty } from "@/shared/types/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "./keys"

export function useDroptimizers() {
    return useQuery({
        queryKey: [queryKeys.droptimizers],
        queryFn: () => getDroptimizerListAction(),
    })
}

export function useLatestDroptimizers() {
    return useQuery({
        queryKey: [queryKeys.droptimizers, "latest"],
        queryFn: () => getDroptimizerLatestListAction(),
    })
}

export function useDeleteDroptimizer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (url: string) => deleteDroptimizerAction(url),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
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
            if (!charName || !charRealm || !raidDiff)
                throw new Error("Missing parameters")
            return getDroptimizerLastByCharAndDiffAction(charName, charRealm, raidDiff)
        },
        enabled: !!charName && !!charRealm && !!raidDiff,
    })
}

export function useAddSimC() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (simcData: string) => addSimCAction(simcData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
    })
}

export function useAddSimulationFromUrl() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (url: string) => addSimulationFromUrlAction(url),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
    })
}

export function useSyncDroptimizersFromDiscord() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (hours: number) => syncDroptimizersFromDiscordAction(hours),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
    })
}

export function useDeleteSimulationsOlderThanHours() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (hours: number) => deleteSimulationsOlderThanHoursAction(hours),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
    })
}

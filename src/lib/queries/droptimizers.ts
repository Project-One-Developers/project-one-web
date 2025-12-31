"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import {
    addSimC,
    addSimulationFromUrl,
    deleteDroptimizer,
    deleteSimulationsOlderThan,
    getDroptimizerByCharacterIdAndDiff,
    getDroptimizerLatestList,
    getDroptimizerList,
    syncDroptimizersFromDiscord,
} from "@/actions/droptimizer"
import { s } from "@/lib/safe-stringify"
import type { WowRaidDifficulty } from "@/shared/models/wow.model"
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

    return useAction(deleteDroptimizer, {
        onSuccess: () => {
            toast.success("Droptimizer deleted.")
            void queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to delete droptimizer")
        },
    })
}

export function useDroptimizerByCharacterIdAndDiff(
    characterId: string | undefined,
    raidDiff: WowRaidDifficulty | undefined
) {
    return useQuery({
        queryKey: [queryKeys.droptimizers, "byCharacterIdAndDiff", characterId, raidDiff],
        queryFn: () => {
            if (!characterId || !raidDiff) {
                throw new Error("Missing parameters")
            }
            return getDroptimizerByCharacterIdAndDiff(characterId, raidDiff)
        },
        enabled: !!characterId && !!raidDiff,
        staleTime: 30000,
    })
}

export function useAddSimC() {
    const queryClient = useQueryClient()

    return useAction(addSimC, {
        onSuccess: () => {
            toast.success("SimC data added.")
            void queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to add SimC data")
        },
    })
}

export function useAddSimulationFromUrl() {
    const queryClient = useQueryClient()

    return useAction(addSimulationFromUrl, {
        onSuccess: () => {
            toast.success("Simulation added.")
            void queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to add simulation")
        },
    })
}

export function useSyncDroptimizersFromDiscord() {
    const queryClient = useQueryClient()

    return useAction(syncDroptimizersFromDiscord, {
        onSuccess: ({ data }) => {
            toast.success(`Synced ${s(data.imported)} droptimizers from Discord.`)
            void queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to sync droptimizers from Discord")
        },
    })
}

export function useDeleteSimulationsOlderThan() {
    const queryClient = useQueryClient()

    return useAction(deleteSimulationsOlderThan, {
        onSuccess: () => {
            toast.success("Old simulations deleted.")
            void queryClient.invalidateQueries({ queryKey: [queryKeys.droptimizers] })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to delete old simulations")
        },
    })
}

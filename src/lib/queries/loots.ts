"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import {
    addLoots,
    addManualLoot,
    assignLoot,
    deleteLoot,
    getCharactersWithLootsByItemId,
    getLootAssignmentInfo,
    getLootsBySessionId,
    getLootsBySessionIdWithAssigned,
    getLootsBySessionIdsWithAssigned,
    getLootsBySessionIdWithItem,
    getLootWithItemById,
    importMrtLoot,
    importRcLootAssignments,
    importRcLootCsv,
    tradeLoot,
    unassignLoot,
    untradeLoot,
} from "@/actions/loots"
import { s } from "@/lib/safe-stringify"
import { queryKeys } from "./keys"

// ============== QUERIES ==============

export function useLootsBySession(raidSessionId: string | undefined) {
    return useQuery({
        queryKey: [queryKeys.loots, "session", raidSessionId],
        queryFn: () => {
            if (!raidSessionId) {
                throw new Error("No raid session id provided")
            }
            return getLootsBySessionId(raidSessionId)
        },
        enabled: !!raidSessionId,
        refetchInterval: 5000,
        refetchOnWindowFocus: true,
    })
}

export function useLootsBySessionWithItem(raidSessionId: string | undefined) {
    return useQuery({
        queryKey: [queryKeys.loots, "session", raidSessionId, "withItem"],
        queryFn: () => {
            if (!raidSessionId) {
                throw new Error("No raid session id provided")
            }
            return getLootsBySessionIdWithItem(raidSessionId)
        },
        enabled: !!raidSessionId,
        refetchInterval: 5000,
        refetchOnWindowFocus: true,
    })
}

export function useLootsBySessionWithAssigned(raidSessionId: string | undefined) {
    return useQuery({
        queryKey: [queryKeys.loots, "session", raidSessionId, "withAssigned"],
        queryFn: () => {
            if (!raidSessionId) {
                throw new Error("No raid session id provided")
            }
            return getLootsBySessionIdWithAssigned(raidSessionId)
        },
        enabled: !!raidSessionId,
        refetchInterval: 5000,
        refetchOnWindowFocus: true,
    })
}

export function useLootsBySessionsWithAssigned(raidSessionIds: string[]) {
    return useQuery({
        queryKey: [queryKeys.loots, "sessions", raidSessionIds, "withAssigned"],
        queryFn: () => getLootsBySessionIdsWithAssigned(raidSessionIds),
        enabled: raidSessionIds.length > 0,
        refetchInterval: 5000,
        refetchOnWindowFocus: true,
    })
}

export function useLootWithItem(lootId: string | undefined) {
    return useQuery({
        queryKey: [queryKeys.loots, lootId, "withItem"],
        queryFn: () => {
            if (!lootId) {
                throw new Error("No loot id provided")
            }
            return getLootWithItemById(lootId)
        },
        enabled: !!lootId,
    })
}

// ============== MUTATIONS ==============

export function useAddLoots() {
    const queryClient = useQueryClient()

    return useAction(addLoots, {
        onSuccess: ({ input }) => {
            toast.success("Loots added successfully.")
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.loots, "session", input.raidSessionId],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSession, input.raidSessionId],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to add loots")
        },
    })
}

export function useAssignLoot() {
    const queryClient = useQueryClient()

    return useAction(assignLoot, {
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.loots] })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to assign loot")
        },
    })
}

export function useUnassignLoot() {
    const queryClient = useQueryClient()

    return useAction(unassignLoot, {
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.loots] })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to unassign loot")
        },
    })
}

export function useTradeLoot() {
    const queryClient = useQueryClient()

    return useAction(tradeLoot, {
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.loots] })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to mark loot as traded")
        },
    })
}

export function useUntradeLoot() {
    const queryClient = useQueryClient()

    return useAction(untradeLoot, {
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.loots] })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to unmark loot as traded")
        },
    })
}

export function useDeleteLoot() {
    const queryClient = useQueryClient()

    return useAction(deleteLoot, {
        onSuccess: () => {
            toast.success("Loot deleted successfully.")
            void queryClient.invalidateQueries({ queryKey: [queryKeys.loots] })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to delete loot")
        },
    })
}

export function useLootAssignmentInfo(lootId: string | undefined) {
    return useQuery({
        queryKey: [queryKeys.loots, lootId, "assignmentInfo"],
        queryFn: () => {
            if (!lootId) {
                throw new Error("No loot id provided")
            }
            return getLootAssignmentInfo(lootId)
        },
        enabled: !!lootId,
        refetchInterval: 10000,
        refetchOnWindowFocus: true,
    })
}

export function useCharactersWithLootsByItemId(itemId: number | undefined) {
    return useQuery({
        queryKey: [queryKeys.loots, "charactersByItem", itemId],
        queryFn: () => {
            if (!itemId) {
                throw new Error("No item id provided")
            }
            return getCharactersWithLootsByItemId(itemId)
        },
        enabled: !!itemId,
    })
}

export function useImportRcLoot() {
    const queryClient = useQueryClient()

    return useAction(importRcLootCsv, {
        onSuccess: ({ data, input }) => {
            toast.success(`Imported ${s(data.imported)} loot items.`)
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.loots, "session", input.raidSessionId],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSession, input.raidSessionId],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to import RC loot")
        },
    })
}

export function useImportRcAssignments() {
    const queryClient = useQueryClient()

    return useAction(importRcLootAssignments, {
        onSuccess: ({ data, input }) => {
            toast.success(`Assigned ${s(data.assigned)} loots.`)
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.loots, "session", input.raidSessionId],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to import RC assignments")
        },
    })
}

export function useImportMrtLoot() {
    const queryClient = useQueryClient()

    return useAction(importMrtLoot, {
        onSuccess: ({ data, input }) => {
            toast.success(`Imported ${s(data.imported)} loot items.`)
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.loots, "session", input.raidSessionId],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSession, input.raidSessionId],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to import MRT loot")
        },
    })
}

export function useAddManualLoot() {
    const queryClient = useQueryClient()

    return useAction(addManualLoot, {
        onSuccess: ({ data, input }) => {
            toast.success(`Added ${s(data.imported)} manual loot items.`)
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.loots, "session", input.raidSessionId],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSession, input.raidSessionId],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to add manual loot")
        },
    })
}

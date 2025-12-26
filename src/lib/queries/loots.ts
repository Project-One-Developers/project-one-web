"use client"

import {
    addLootsAction,
    addManualLootAction,
    assignLootAction,
    deleteLootAction,
    getCharactersWithLootsByItemIdAction,
    getLootAssignmentInfoAction,
    getLootsBySessionIdAction,
    getLootsBySessionIdWithAssignedAction,
    getLootsBySessionIdsWithAssignedAction,
    getLootsBySessionIdWithItemAction,
    getLootWithItemByIdAction,
    importMrtLootAction,
    importRcLootAssignmentsAction,
    importRcLootCsvAction,
    tradeLootAction,
    unassignLootAction,
    untradeLootAction,
} from "@/actions/loots"
import type {
    CharAssignmentHighlights,
    NewLoot,
    NewLootManual,
} from "@/shared/types/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "./keys"

// ============== QUERIES ==============

export function useLootsBySession(raidSessionId: string | undefined) {
    return useQuery({
        queryKey: [queryKeys.loots, "session", raidSessionId],
        queryFn: () => {
            if (!raidSessionId) {
                throw new Error("No raid session id provided")
            }
            return getLootsBySessionIdAction(raidSessionId)
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
            return getLootsBySessionIdWithItemAction(raidSessionId)
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
            return getLootsBySessionIdWithAssignedAction(raidSessionId)
        },
        enabled: !!raidSessionId,
        refetchInterval: 5000,
        refetchOnWindowFocus: true,
    })
}

export function useLootsBySessionsWithAssigned(raidSessionIds: string[]) {
    return useQuery({
        queryKey: [queryKeys.loots, "sessions", raidSessionIds, "withAssigned"],
        queryFn: () => getLootsBySessionIdsWithAssignedAction(raidSessionIds),
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
            return getLootWithItemByIdAction(lootId)
        },
        enabled: !!lootId,
    })
}

// ============== MUTATIONS ==============

export function useAddLoots() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            raidSessionId,
            loots,
        }: {
            raidSessionId: string
            loots: NewLoot[]
        }) => addLootsAction(raidSessionId, loots),
        onSuccess: (_, vars) => {
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.loots, "session", vars.raidSessionId],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSession, vars.raidSessionId],
            })
        },
    })
}

export function useAssignLoot() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            charId,
            lootId,
            highlights,
        }: {
            charId: string
            lootId: string
            highlights: CharAssignmentHighlights | null
            raidSessionId?: string
        }) => assignLootAction(charId, lootId, highlights),
        onSuccess: (_, vars) => {
            if (vars.raidSessionId) {
                void queryClient.invalidateQueries({
                    queryKey: [queryKeys.loots, "session", vars.raidSessionId],
                })
                void queryClient.invalidateQueries({
                    queryKey: [queryKeys.loots, "sessions"],
                })
            } else {
                void queryClient.invalidateQueries({ queryKey: [queryKeys.loots] })
            }
        },
    })
}

export function useUnassignLoot() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ lootId }: { lootId: string; raidSessionId?: string }) =>
            unassignLootAction(lootId),
        onSuccess: (_, vars) => {
            if (vars.raidSessionId) {
                void queryClient.invalidateQueries({
                    queryKey: [queryKeys.loots, "session", vars.raidSessionId],
                })
                void queryClient.invalidateQueries({
                    queryKey: [queryKeys.loots, "sessions"],
                })
            } else {
                void queryClient.invalidateQueries({ queryKey: [queryKeys.loots] })
            }
        },
    })
}

export function useTradeLoot() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ lootId }: { lootId: string; raidSessionId?: string }) =>
            tradeLootAction(lootId),
        onSuccess: (_, vars) => {
            if (vars.raidSessionId) {
                void queryClient.invalidateQueries({
                    queryKey: [queryKeys.loots, "session", vars.raidSessionId],
                })
                void queryClient.invalidateQueries({
                    queryKey: [queryKeys.loots, "sessions"],
                })
            } else {
                void queryClient.invalidateQueries({ queryKey: [queryKeys.loots] })
            }
        },
    })
}

export function useUntradeLoot() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ lootId }: { lootId: string; raidSessionId?: string }) =>
            untradeLootAction(lootId),
        onSuccess: (_, vars) => {
            if (vars.raidSessionId) {
                void queryClient.invalidateQueries({
                    queryKey: [queryKeys.loots, "session", vars.raidSessionId],
                })
                void queryClient.invalidateQueries({
                    queryKey: [queryKeys.loots, "sessions"],
                })
            } else {
                void queryClient.invalidateQueries({ queryKey: [queryKeys.loots] })
            }
        },
    })
}

export function useDeleteLoot() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ lootId }: { lootId: string; raidSessionId?: string }) =>
            deleteLootAction(lootId),
        onSuccess: (_, vars) => {
            if (vars.raidSessionId) {
                void queryClient.invalidateQueries({
                    queryKey: [queryKeys.loots, "session", vars.raidSessionId],
                })
                void queryClient.invalidateQueries({
                    queryKey: [queryKeys.loots, "sessions"],
                })
            } else {
                void queryClient.invalidateQueries({ queryKey: [queryKeys.loots] })
            }
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
            return getLootAssignmentInfoAction(lootId)
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
            return getCharactersWithLootsByItemIdAction(itemId)
        },
        enabled: !!itemId,
    })
}

export function useImportRcLoot() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            raidSessionId,
            csv,
            importAssignedCharacter,
        }: {
            raidSessionId: string
            csv: string
            importAssignedCharacter: boolean
        }) => importRcLootCsvAction(raidSessionId, csv, importAssignedCharacter),
        onSuccess: (_, vars) => {
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.loots, "session", vars.raidSessionId],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSession, vars.raidSessionId],
            })
        },
    })
}

export function useImportRcAssignments() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ raidSessionId, csv }: { raidSessionId: string; csv: string }) =>
            importRcLootAssignmentsAction(raidSessionId, csv),
        onSuccess: (_, vars) => {
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.loots, "session", vars.raidSessionId],
            })
        },
    })
}

export function useImportMrtLoot() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ raidSessionId, data }: { raidSessionId: string; data: string }) =>
            importMrtLootAction(raidSessionId, data),
        onSuccess: (_, vars) => {
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.loots, "session", vars.raidSessionId],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSession, vars.raidSessionId],
            })
        },
    })
}

export function useAddManualLoot() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            raidSessionId,
            manualLoots,
        }: {
            raidSessionId: string
            manualLoots: NewLootManual[]
        }) => addManualLootAction(raidSessionId, manualLoots),
        onSuccess: (_, vars) => {
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.loots, "session", vars.raidSessionId],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSession, vars.raidSessionId],
            })
        },
    })
}

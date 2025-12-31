"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
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
import { unwrap } from "@/lib/result"
import { s } from "@/lib/safe-stringify"
import type {
    CharAssignmentHighlights,
    NewLoot,
    NewLootManual,
} from "@/shared/models/loot.model"
import { queryKeys } from "./keys"
import {
    useMutationWithResult,
    useVoidMutationWithResult,
} from "./use-mutation-with-result"

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

    return useVoidMutationWithResult({
        mutationFn: ({
            raidSessionId,
            loots,
        }: {
            raidSessionId: string
            loots: NewLoot[]
        }) => addLoots(raidSessionId, loots),
        successMessage: "Loots added successfully.",
        onSuccess: (vars) => {
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

    return useVoidMutationWithResult({
        mutationFn: ({
            charId,
            lootId,
            highlights,
        }: {
            charId: string
            lootId: string
            highlights: CharAssignmentHighlights | null
            raidSessionId?: string
        }) => assignLoot(charId, lootId, highlights),
        onSuccess: (vars) => {
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

    return useVoidMutationWithResult({
        mutationFn: ({ lootId }: { lootId: string; raidSessionId?: string }) =>
            unassignLoot(lootId),
        onSuccess: (vars) => {
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

    return useVoidMutationWithResult({
        mutationFn: ({ lootId }: { lootId: string; raidSessionId?: string }) =>
            tradeLoot(lootId),
        onSuccess: (vars) => {
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

    return useVoidMutationWithResult({
        mutationFn: ({ lootId }: { lootId: string; raidSessionId?: string }) =>
            untradeLoot(lootId),
        onSuccess: (vars) => {
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

    return useVoidMutationWithResult({
        mutationFn: ({ lootId }: { lootId: string; raidSessionId?: string }) =>
            deleteLoot(lootId),
        successMessage: "Loot deleted successfully.",
        onSuccess: (vars) => {
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
        queryFn: async () => {
            if (!itemId) {
                throw new Error("No item id provided")
            }
            const result = await getCharactersWithLootsByItemId(itemId)
            return unwrap(result)
        },
        enabled: !!itemId,
    })
}

export function useImportRcLoot() {
    const queryClient = useQueryClient()

    return useMutationWithResult({
        mutationFn: ({
            raidSessionId,
            csv,
            importAssignedCharacter,
        }: {
            raidSessionId: string
            csv: string
            importAssignedCharacter: boolean
        }) => importRcLootCsv(raidSessionId, csv, importAssignedCharacter),
        successMessage: (data: { imported: number }) =>
            `Imported ${s(data.imported)} loot items.`,
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

    return useMutationWithResult({
        mutationFn: ({ raidSessionId, csv }: { raidSessionId: string; csv: string }) =>
            importRcLootAssignments(raidSessionId, csv),
        successMessage: (data: { assigned: number }) =>
            `Assigned ${s(data.assigned)} loots.`,
        onSuccess: (_, vars) => {
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.loots, "session", vars.raidSessionId],
            })
        },
    })
}

export function useImportMrtLoot() {
    const queryClient = useQueryClient()

    return useMutationWithResult({
        mutationFn: ({ raidSessionId, data }: { raidSessionId: string; data: string }) =>
            importMrtLoot(raidSessionId, data),
        successMessage: (result: { imported: number }) =>
            `Imported ${s(result.imported)} loot items.`,
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

    return useMutationWithResult({
        mutationFn: ({
            raidSessionId,
            manualLoots,
        }: {
            raidSessionId: string
            manualLoots: NewLootManual[]
        }) => addManualLoot(raidSessionId, manualLoots),
        successMessage: (data: { imported: number }) =>
            `Added ${s(data.imported)} manual loot items.`,
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

"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
    addManualLoot,
    assignLoot,
    deleteLoot,
    getCharactersWithLootsByItemId,
    getLootAssignmentInfo,
    getLootsBySessionIdsWithAssigned,
    getLootsBySessionIdWithItem,
    importMrtLoot,
    importRcLootAssignments,
    importRcLootCsv,
    unassignLoot,
} from "@/actions/loots"
import { unwrap } from "@/lib/errors"
import type { CharAssignmentHighlights, NewLootManual } from "@/shared/models/loot.models"
import { queryKeys } from "./keys"

// ============== QUERIES ==============

export function useLootsBySessionWithItem(raidSessionId: string | undefined) {
    return useQuery({
        queryKey: [queryKeys.loots, "session", raidSessionId, "withItem"],
        queryFn: () => {
            if (!raidSessionId) {
                throw new Error("No raid session id provided")
            }
            return unwrap(getLootsBySessionIdWithItem(raidSessionId))
        },
        enabled: !!raidSessionId,
        refetchInterval: 5000,
        refetchOnWindowFocus: true,
    })
}

export function useLootsBySessionsWithAssigned(raidSessionIds: string[]) {
    return useQuery({
        queryKey: [queryKeys.loots, "sessions", raidSessionIds, "withAssigned"],
        queryFn: () => unwrap(getLootsBySessionIdsWithAssigned(raidSessionIds)),
        enabled: raidSessionIds.length > 0,
        refetchInterval: 5000,
        refetchOnWindowFocus: true,
    })
}

// ============== MUTATIONS ==============

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
        }) => unwrap(assignLoot(charId, lootId, highlights)),
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
            unwrap(unassignLoot(lootId)),
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
            unwrap(deleteLoot(lootId)),
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
            return unwrap(getLootAssignmentInfo(lootId))
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
            return unwrap(getCharactersWithLootsByItemId(itemId))
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
        }) => unwrap(importRcLootCsv(raidSessionId, csv, importAssignedCharacter)),
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
            unwrap(importRcLootAssignments(raidSessionId, csv)),
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
            unwrap(importMrtLoot(raidSessionId, data)),
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
        }) => unwrap(addManualLoot(raidSessionId, manualLoots)),
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

"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
    addRaidSession,
    cloneRaidSession,
    deleteRaidSession,
    editRaidSession,
    getRaidSessionWithRoster,
    getRaidSessionWithSummaryList,
    importRosterInRaidSession,
} from "@/actions/raid-sessions"
import type { EditRaidSession, NewRaidSession } from "@/shared/models/raid-session.model"
import { queryKeys } from "./keys"
import {
    useMutationWithResult,
    useVoidMutationWithResult,
} from "./use-mutation-with-result"

export function useRaidSessions() {
    return useQuery({
        queryKey: [queryKeys.raidSessions],
        queryFn: () => getRaidSessionWithSummaryList(),
        refetchInterval: 10000,
        refetchOnWindowFocus: true,
    })
}

export function useRaidSession(id: string | undefined) {
    return useQuery({
        queryKey: [queryKeys.raidSession, id],
        queryFn: () => {
            if (!id) {
                throw new Error("No raid session id provided")
            }
            return getRaidSessionWithRoster(id)
        },
        enabled: !!id,
        refetchInterval: 10000,
        refetchOnWindowFocus: true,
    })
}

export function useAddRaidSession() {
    return useMutationWithResult({
        mutationFn: (session: NewRaidSession) => addRaidSession(session),
        invalidateKeys: [[queryKeys.raidSessions]],
        successMessage: (data) => `Raid session "${data.name}" created.`,
    })
}

export function useEditRaidSession() {
    const queryClient = useQueryClient()

    return useMutationWithResult({
        mutationFn: (session: EditRaidSession) => editRaidSession(session),
        invalidateKeys: [[queryKeys.raidSessions]],
        successMessage: (data) => `Raid session "${data.name}" updated.`,
        onSuccess: (data) => {
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSession, data.id],
            })
        },
    })
}

export function useDeleteRaidSession() {
    return useVoidMutationWithResult({
        mutationFn: (id: string) => deleteRaidSession(id),
        invalidateKeys: [[queryKeys.raidSessions]],
        successMessage: "Raid session deleted.",
    })
}

export function useCloneRaidSession() {
    return useMutationWithResult({
        mutationFn: (id: string) => cloneRaidSession(id),
        invalidateKeys: [[queryKeys.raidSessions]],
        successMessage: (data) => `Raid session cloned as "${data.name}".`,
    })
}

export function useImportRosterInRaidSession() {
    const queryClient = useQueryClient()

    return useVoidMutationWithResult({
        mutationFn: ({ raidSessionId, csv }: { raidSessionId: string; csv: string }) =>
            importRosterInRaidSession(raidSessionId, csv),
        invalidateKeys: [[queryKeys.raidSessions]],
        successMessage: "Roster imported successfully.",
        onSuccess: (vars) => {
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSession, vars.raidSessionId],
            })
        },
    })
}

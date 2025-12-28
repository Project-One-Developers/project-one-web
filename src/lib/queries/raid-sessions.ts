"use client"

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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "./keys"

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
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (session: NewRaidSession) => addRaidSession(session),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.raidSessions] })
        },
    })
}

export function useEditRaidSession() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (session: EditRaidSession) => editRaidSession(session),
        onSuccess: (_, vars) => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.raidSessions] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSession, vars.id],
            })
        },
    })
}

export function useDeleteRaidSession() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => deleteRaidSession(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.raidSessions] })
        },
    })
}

export function useCloneRaidSession() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => cloneRaidSession(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.raidSessions] })
        },
    })
}

export function useImportRosterInRaidSession() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ raidSessionId, csv }: { raidSessionId: string; csv: string }) =>
            importRosterInRaidSession(raidSessionId, csv),
        onSuccess: (_, vars) => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.raidSessions] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSession, vars.raidSessionId],
            })
        },
    })
}

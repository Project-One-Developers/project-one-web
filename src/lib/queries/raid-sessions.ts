"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import {
    addRaidSession,
    cloneRaidSession,
    deleteRaidSession,
    editRaidSession,
    getRaidSessionWithRoster,
    getRaidSessionWithSummaryList,
    importRosterInRaidSession,
} from "@/actions/raid-sessions"
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

    return useAction(addRaidSession, {
        onSuccess: ({ data }) => {
            toast.success(`Raid session "${data.name}" created.`)
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSessions],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to create raid session")
        },
    })
}

export function useEditRaidSession() {
    const queryClient = useQueryClient()

    return useAction(editRaidSession, {
        onSuccess: ({ data }) => {
            toast.success(`Raid session "${data.name}" updated.`)
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSessions],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSession, data.id],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to update raid session")
        },
    })
}

export function useDeleteRaidSession() {
    const queryClient = useQueryClient()

    return useAction(deleteRaidSession, {
        onSuccess: () => {
            toast.success("Raid session deleted.")
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSessions],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to delete raid session")
        },
    })
}

export function useCloneRaidSession() {
    const queryClient = useQueryClient()

    return useAction(cloneRaidSession, {
        onSuccess: ({ data }) => {
            toast.success(`Raid session cloned as "${data.name}".`)
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSessions],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to clone raid session")
        },
    })
}

export function useImportRosterInRaidSession() {
    const queryClient = useQueryClient()

    return useAction(importRosterInRaidSession, {
        onSuccess: ({ input }) => {
            toast.success("Roster imported successfully.")
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSessions],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.raidSession, input.raidSessionId],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to import roster")
        },
    })
}

"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import {
    deleteItemNote,
    getAllItemNotes,
    getItemById,
    getItemNote,
    getItems,
    getRaidItems,
    searchItems,
    setItemNote,
} from "@/actions/items"
import { queryKeys } from "./keys"

// ============== QUERIES ==============

export function useItems() {
    return useQuery({
        queryKey: [queryKeys.items],
        queryFn: () => getItems(),
        staleTime: 3600000, // 1 hour - item data is static per patch
    })
}

export function useRaidItems() {
    return useQuery({
        queryKey: [queryKeys.items, "raid"],
        queryFn: () => getRaidItems(),
        staleTime: 3600000, // 1 hour - item data is static per patch
    })
}

export function useItem(id: number | undefined) {
    return useQuery({
        queryKey: [queryKeys.items, id],
        queryFn: () => {
            if (!id) {
                throw new Error("No item id provided")
            }
            return getItemById(id)
        },
        enabled: !!id,
    })
}

export function useSearchItems(searchTerm: string, limit = 20) {
    return useQuery({
        queryKey: [queryKeys.items, "search", searchTerm, limit],
        queryFn: () => searchItems(searchTerm, limit),
        enabled: searchTerm.length >= 2,
        staleTime: 3600000, // 1 hour - item data is static per patch
    })
}

export function useItemNotes() {
    return useQuery({
        queryKey: [queryKeys.items, "notes"],
        queryFn: () => getAllItemNotes(),
        staleTime: 60000, // 1 minute - user-editable but not frequent
    })
}

export function useItemNote(id: number | undefined) {
    return useQuery({
        queryKey: [queryKeys.items, "notes", id],
        queryFn: () => {
            if (!id) {
                throw new Error("No item id provided")
            }
            return getItemNote(id)
        },
        enabled: !!id,
    })
}

// ============== MUTATIONS ==============

export function useSetItemNote() {
    const queryClient = useQueryClient()

    return useAction(setItemNote, {
        onSuccess: ({ input }) => {
            toast.success("Note saved")
            void queryClient.invalidateQueries({ queryKey: [queryKeys.items, "notes"] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.items, "notes", input.id],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to save note")
        },
    })
}

export function useDeleteItemNote() {
    const queryClient = useQueryClient()

    return useAction(deleteItemNote, {
        onSuccess: ({ input }) => {
            toast.success("Note deleted")
            void queryClient.invalidateQueries({ queryKey: [queryKeys.items, "notes"] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.items, "notes", input.id],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to delete note")
        },
    })
}

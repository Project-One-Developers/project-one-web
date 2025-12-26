"use client"

import {
    deleteItemNoteAction,
    getAllItemNotesAction,
    getItemByIdAction,
    getItemNoteAction,
    getItemsAction,
    getRaidItemsAction,
    searchItemsAction,
    setItemNoteAction,
} from "@/actions/items"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "./keys"

// ============== QUERIES ==============

export function useItems() {
    return useQuery({
        queryKey: [queryKeys.items],
        queryFn: () => getItemsAction(),
    })
}

export function useRaidItems() {
    return useQuery({
        queryKey: [queryKeys.items, "raid"],
        queryFn: () => getRaidItemsAction(),
    })
}

export function useItem(id: number | undefined) {
    return useQuery({
        queryKey: [queryKeys.items, id],
        queryFn: () => {
            if (!id) {
                throw new Error("No item id provided")
            }
            return getItemByIdAction(id)
        },
        enabled: !!id,
    })
}

export function useSearchItems(searchTerm: string, limit = 20) {
    return useQuery({
        queryKey: [queryKeys.items, "search", searchTerm, limit],
        queryFn: () => searchItemsAction(searchTerm, limit),
        enabled: searchTerm.length >= 2,
    })
}

export function useItemNotes() {
    return useQuery({
        queryKey: [queryKeys.items, "notes"],
        queryFn: () => getAllItemNotesAction(),
    })
}

export function useItemNote(id: number | undefined) {
    return useQuery({
        queryKey: [queryKeys.items, "notes", id],
        queryFn: () => {
            if (!id) {
                throw new Error("No item id provided")
            }
            return getItemNoteAction(id)
        },
        enabled: !!id,
    })
}

// ============== MUTATIONS ==============

export function useSetItemNote() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, note }: { id: number; note: string }) =>
            setItemNoteAction(id, note),
        onSuccess: (_, vars) => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.items, "notes"] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.items, "notes", vars.id],
            })
        },
    })
}

export function useDeleteItemNote() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => deleteItemNoteAction(id),
        onSuccess: (_, id) => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.items, "notes"] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.items, "notes", id],
            })
        },
    })
}

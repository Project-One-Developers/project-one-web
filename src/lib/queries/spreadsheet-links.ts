"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
    addSpreadsheetLink,
    deleteSpreadsheetLink,
    editSpreadsheetLink,
    getSpreadsheetLinks,
} from "@/actions/spreadsheet-links"
import { unwrap } from "@/lib/errors"
import type {
    EditSpreadsheetLink,
    NewSpreadsheetLink,
} from "@/shared/models/spreadsheet-link.models"
import { queryKeys } from "./keys"

export function useSpreadsheetLinks() {
    return useQuery({
        queryKey: [queryKeys.spreadsheetLinks],
        queryFn: () => unwrap(getSpreadsheetLinks()),
        staleTime: 60000,
    })
}

export function useAddSpreadsheetLink() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (link: NewSpreadsheetLink) => unwrap(addSpreadsheetLink(link)),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.spreadsheetLinks],
            })
        },
    })
}

export function useEditSpreadsheetLink() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (link: EditSpreadsheetLink) => unwrap(editSpreadsheetLink(link)),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.spreadsheetLinks],
            })
        },
    })
}

export function useDeleteSpreadsheetLink() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => unwrap(deleteSpreadsheetLink(id)),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.spreadsheetLinks],
            })
        },
    })
}

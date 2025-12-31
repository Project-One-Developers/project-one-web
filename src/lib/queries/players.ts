"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import {
    addCharacter,
    addCharacterWithSync,
    addPlayer,
    deleteCharacter,
    deletePlayer,
    editCharacter,
    editPlayer,
    getCharacter,
    getCharacterList,
    getCharactersWithPlayerList,
    getCharLatestGameInfo,
    getPlayerWithCharactersList,
    getPlayersWithoutCharacters,
} from "@/actions/characters"
import { getPlayersWithSummaryCompact } from "@/actions/summary"
import type { PlayerWithSummaryCompact } from "@/shared/types/types"
import { queryKeys } from "./keys"

// ============== QUERIES ==============

export function usePlayersWithCharacters() {
    return useQuery({
        queryKey: [queryKeys.playersWithCharacters],
        queryFn: () => getPlayerWithCharactersList(),
        staleTime: 30000,
    })
}

export function usePlayersWithoutCharacters() {
    return useQuery({
        queryKey: [queryKeys.playersWithoutCharacters],
        queryFn: () => getPlayersWithoutCharacters(),
        staleTime: 30000,
    })
}

export function useCharacters() {
    return useQuery({
        queryKey: [queryKeys.characters],
        queryFn: () => getCharacterList(),
        staleTime: 30000,
    })
}

export function useCharactersWithPlayer() {
    return useQuery({
        queryKey: [queryKeys.characters, "withPlayer"],
        queryFn: () => getCharactersWithPlayerList(),
        staleTime: 30000,
    })
}

export function useCharacter(id: string | undefined) {
    return useQuery({
        queryKey: [queryKeys.character, id],
        queryFn: () => {
            if (!id) {
                throw new Error("No character id provided")
            }
            return getCharacter(id)
        },
        enabled: !!id,
    })
}

export function useCharacterGameInfo(characterId?: string) {
    return useQuery({
        queryKey: [queryKeys.characterGameInfo, characterId],
        queryFn: () => {
            if (!characterId) {
                throw new Error("Character ID is required")
            }
            return getCharLatestGameInfo(characterId)
        },
        enabled: !!characterId,
    })
}

// Compact version for roster page - uses consolidated server action
// Single HTTP call instead of 3, eliminates redundant character fetching
export function usePlayersSummaryCompact() {
    return useQuery({
        queryKey: [queryKeys.playersSummary, "compact"],
        staleTime: 30000,
        queryFn: (): Promise<PlayerWithSummaryCompact[]> =>
            getPlayersWithSummaryCompact(),
    })
}

// ============== MUTATIONS ==============

export function useAddPlayer() {
    const queryClient = useQueryClient()

    return useAction(addPlayer, {
        onSuccess: ({ data }) => {
            toast.success(`Player ${data.name} added successfully.`)
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithoutCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersSummary],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to add player")
        },
    })
}

export function useEditPlayer() {
    const queryClient = useQueryClient()

    return useAction(editPlayer, {
        onSuccess: ({ data }) => {
            toast.success(`Player ${data.name} updated successfully.`)
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersSummary],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to update player")
        },
    })
}

export function useDeletePlayer() {
    const queryClient = useQueryClient()

    return useAction(deletePlayer, {
        onSuccess: () => {
            toast.success("Player deleted successfully.")
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithoutCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersSummary],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to delete player")
        },
    })
}

export function useAddCharacter() {
    const queryClient = useQueryClient()

    return useAction(addCharacter, {
        onSuccess: ({ data }) => {
            toast.success(`Character ${data.name} added successfully.`)
            void queryClient.invalidateQueries({ queryKey: [queryKeys.characters] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithoutCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersSummary],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to add character")
        },
    })
}

export function useAddCharacterWithSync() {
    const queryClient = useQueryClient()

    return useAction(addCharacterWithSync, {
        onSuccess: ({ data }) => {
            toast.success(`Character ${data.name} added successfully.`)
            void queryClient.invalidateQueries({ queryKey: [queryKeys.characters] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithoutCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersSummary],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to add character")
        },
    })
}

export function useEditCharacter() {
    const queryClient = useQueryClient()

    return useAction(editCharacter, {
        onSuccess: ({ data }) => {
            toast.success(`Character ${data.name} updated successfully.`)
            void queryClient.invalidateQueries({ queryKey: [queryKeys.characters] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersSummary],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to update character")
        },
    })
}

export function useDeleteCharacter() {
    const queryClient = useQueryClient()

    return useAction(deleteCharacter, {
        onSuccess: () => {
            toast.success("Character deleted successfully.")
            void queryClient.invalidateQueries({ queryKey: [queryKeys.characters] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithoutCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersSummary],
            })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to delete character")
        },
    })
}

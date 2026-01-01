"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import type {
    EditCharacter,
    EditPlayer,
    NewCharacter,
    NewCharacterWithoutClass,
    NewPlayer,
} from "@/shared/models/character.models"
import type { PlayerWithSummaryCompact } from "@/shared/types"
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

    return useMutation({
        mutationFn: (player: NewPlayer) => addPlayer(player),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithoutCharacters],
            })
            void queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] })
        },
    })
}

export function useEditPlayer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (player: EditPlayer) => editPlayer(player),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] })
        },
    })
}

export function useDeletePlayer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => deletePlayer(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithoutCharacters],
            })
            void queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] })
        },
    })
}

export function useAddCharacter() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (character: NewCharacter) => addCharacter(character),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.characters] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithoutCharacters],
            })
            void queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] })
        },
    })
}

export function useAddCharacterWithSync() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (character: NewCharacterWithoutClass) =>
            addCharacterWithSync(character),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.characters] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithoutCharacters],
            })
            void queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] })
        },
    })
}

export function useEditCharacter() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (character: EditCharacter) => editCharacter(character),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.characters] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] })
        },
    })
}

export function useDeleteCharacter() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => deleteCharacter(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.characters] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithoutCharacters],
            })
            void queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] })
        },
    })
}

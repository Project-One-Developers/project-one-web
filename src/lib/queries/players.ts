"use client"

import { useQuery } from "@tanstack/react-query"
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
} from "@/shared/models/character.model"
import type { PlayerWithSummaryCompact } from "@/shared/types/types"
import { queryKeys } from "./keys"
import {
    useMutationWithResult,
    useVoidMutationWithResult,
} from "./use-mutation-with-result"

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
    return useMutationWithResult({
        mutationFn: (player: NewPlayer) => addPlayer(player),
        invalidateKeys: [
            [queryKeys.playersWithCharacters],
            [queryKeys.playersWithoutCharacters],
            [queryKeys.playersSummary],
        ],
        successMessage: (data) => `Player ${data.name} added successfully.`,
    })
}

export function useEditPlayer() {
    return useMutationWithResult({
        mutationFn: (player: EditPlayer) => editPlayer(player),
        invalidateKeys: [[queryKeys.playersWithCharacters], [queryKeys.playersSummary]],
        successMessage: (data) => `Player ${data.name} updated successfully.`,
    })
}

export function useDeletePlayer() {
    return useVoidMutationWithResult({
        mutationFn: (id: string) => deletePlayer(id),
        invalidateKeys: [
            [queryKeys.playersWithCharacters],
            [queryKeys.playersWithoutCharacters],
            [queryKeys.playersSummary],
        ],
        successMessage: "Player deleted successfully.",
    })
}

export function useAddCharacter() {
    return useMutationWithResult({
        mutationFn: (character: NewCharacter) => addCharacter(character),
        invalidateKeys: [
            [queryKeys.characters],
            [queryKeys.playersWithCharacters],
            [queryKeys.playersWithoutCharacters],
            [queryKeys.playersSummary],
        ],
        successMessage: (data) => `Character ${data.name} added successfully.`,
    })
}

export function useAddCharacterWithSync() {
    return useMutationWithResult({
        mutationFn: (character: NewCharacterWithoutClass) =>
            addCharacterWithSync(character),
        invalidateKeys: [
            [queryKeys.characters],
            [queryKeys.playersWithCharacters],
            [queryKeys.playersWithoutCharacters],
            [queryKeys.playersSummary],
        ],
        successMessage: (data) => `Character ${data.name} added successfully.`,
    })
}

export function useEditCharacter() {
    return useMutationWithResult({
        mutationFn: (character: EditCharacter) => editCharacter(character),
        invalidateKeys: [
            [queryKeys.characters],
            [queryKeys.playersWithCharacters],
            [queryKeys.playersSummary],
        ],
        successMessage: (data) => `Character ${data.name} updated successfully.`,
    })
}

export function useDeleteCharacter() {
    return useVoidMutationWithResult({
        mutationFn: (id: string) => deleteCharacter(id),
        invalidateKeys: [
            [queryKeys.characters],
            [queryKeys.playersWithCharacters],
            [queryKeys.playersWithoutCharacters],
            [queryKeys.playersSummary],
        ],
        successMessage: "Character deleted successfully.",
    })
}

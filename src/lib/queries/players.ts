"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
    addCharacterWithManualClass,
    addCharacterWithSync,
    addPlayer,
    deleteCharacter,
    deletePlayer,
    editCharacter,
    editPlayer,
    getCharacterList,
    getCharacterWithGameInfo,
    getPlayerWithCharactersList,
    assignCharacterToPlayer,
} from "@/actions/characters"
import { getPlayersWithSummaryCompact } from "@/actions/summary"
import { ActionError, unwrap, type SerializedAppError } from "@/lib/errors"
import type {
    CharacterWithPlayer,
    EditCharacterData,
    EditPlayer,
    NewCharacter,
    NewCharacterWithoutClass,
    NewPlayer,
    Player,
} from "@/shared/models/character.models"
import type { PlayerWithSummaryCompact } from "@/shared/types"
import { queryKeys } from "./keys"

// ============== QUERIES ==============

export function usePlayersWithCharacters() {
    return useQuery({
        queryKey: [queryKeys.playersWithCharacters],
        queryFn: () => unwrap(getPlayerWithCharactersList()),
        staleTime: 30000,
    })
}

export function useCharacters() {
    return useQuery({
        queryKey: [queryKeys.characters],
        queryFn: () => unwrap(getCharacterList()),
        staleTime: 30000,
    })
}

export function useCharacterWithGameInfo(id: string | undefined) {
    return useQuery({
        queryKey: [queryKeys.character, id, "withGameInfo"],
        queryFn: () => {
            if (!id) {
                throw new Error("No character id provided")
            }
            return unwrap(getCharacterWithGameInfo(id))
        },
        enabled: !!id,
    })
}

// Compact version for roster page - uses consolidated server action
// Single HTTP call instead of 3, eliminates redundant character fetching
export function usePlayersSummaryCompact() {
    return useQuery({
        queryKey: [queryKeys.playersSummary, "compact"],
        staleTime: 30000,
        queryFn: () => unwrap(getPlayersWithSummaryCompact()),
    })
}

// ============== HELPER ==============

/**
 * Helper to throw an ActionError from a failed result.
 * Satisfies @typescript-eslint/only-throw-error rule.
 */
function throwActionError(error: SerializedAppError): never {
    throw new ActionError(error)
}

// ============== MUTATIONS ==============

export function useAddPlayer() {
    const queryClient = useQueryClient()

    return useMutation<Player | null, ActionError, NewPlayer>({
        mutationFn: async (player) => {
            const result = await addPlayer(player)
            if (!result.success) {
                throwActionError(result.error)
            }
            return result.data
        },
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

    return useMutation<Player | null, ActionError, EditPlayer>({
        mutationFn: async (player) => {
            const result = await editPlayer(player)
            if (!result.success) {
                throwActionError(result.error)
            }
            return result.data
        },
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

    return useMutation<undefined, ActionError, string>({
        mutationFn: async (id) => {
            const result = await deletePlayer(id)
            if (!result.success) {
                throwActionError(result.error)
            }
            return undefined
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] })
        },
    })
}

export function useAddCharacterWithSync() {
    const queryClient = useQueryClient()

    return useMutation<CharacterWithPlayer | null, ActionError, NewCharacterWithoutClass>(
        {
            mutationFn: async (character) => {
                const result = await addCharacterWithSync(character)
                if (!result.success) {
                    throwActionError(result.error)
                }
                return result.data
            },
            onSuccess: () => {
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
        }
    )
}

export function useAddCharacterWithManualClass() {
    const queryClient = useQueryClient()

    return useMutation<CharacterWithPlayer | null, ActionError, NewCharacter>({
        mutationFn: async (character) => {
            const result = await addCharacterWithManualClass(character)
            if (!result.success) {
                throwActionError(result.error)
            }
            return result.data
        },
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

    return useMutation<
        CharacterWithPlayer | null,
        ActionError,
        { id: string; data: EditCharacterData }
    >({
        mutationFn: async ({ id, data }) => {
            const result = await editCharacter(id, data)
            if (!result.success) {
                throwActionError(result.error)
            }
            return result.data
        },
        onSuccess: (_data, variables) => {
            void queryClient.invalidateQueries({ queryKey: [queryKeys.characters] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.character, variables.id],
            })
        },
    })
}

export function useDeleteCharacter() {
    const queryClient = useQueryClient()

    return useMutation<undefined, ActionError, string>({
        mutationFn: async (id) => {
            const result = await deleteCharacter(id)
            if (!result.success) {
                throwActionError(result.error)
            }
            return undefined
        },
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

export function useAssignCharacterToPlayer() {
    const queryClient = useQueryClient()

    return useMutation<
        CharacterWithPlayer | null,
        ActionError,
        { characterId: string; targetPlayerId: string },
        { previousData: PlayerWithSummaryCompact[] | undefined }
    >({
        mutationFn: async ({ characterId, targetPlayerId }) => {
            const result = await assignCharacterToPlayer(characterId, targetPlayerId)
            if (!result.success) {
                throwActionError(result.error)
            }
            return result.data
        },

        onMutate: async ({ characterId, targetPlayerId }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({
                queryKey: [queryKeys.playersSummary, "compact"],
            })

            // Snapshot previous value
            const previousData = queryClient.getQueryData<PlayerWithSummaryCompact[]>([
                queryKeys.playersSummary,
                "compact",
            ])

            // Optimistically update
            if (previousData) {
                const newData = previousData.map((player) => {
                    // Find and remove character from source player
                    const charIndex = player.charsSummary.findIndex(
                        (cs) => cs.character.id === characterId
                    )

                    if (charIndex !== -1) {
                        // This is the source player - remove the character
                        return {
                            ...player,
                            charsSummary: player.charsSummary.filter(
                                (cs) => cs.character.id !== characterId
                            ),
                        }
                    }

                    if (player.id === targetPlayerId) {
                        // This is the target player - add the character
                        const sourcePlayer = previousData.find((p) =>
                            p.charsSummary.some((cs) => cs.character.id === characterId)
                        )
                        const charSummary = sourcePlayer?.charsSummary.find(
                            (cs) => cs.character.id === characterId
                        )

                        if (charSummary) {
                            // Insert in alphabetical order
                            const newCharsSummary = [
                                ...player.charsSummary,
                                charSummary,
                            ].sort((a, b) =>
                                a.character.name.localeCompare(b.character.name)
                            )
                            return {
                                ...player,
                                charsSummary: newCharsSummary,
                            }
                        }
                    }

                    return player
                })

                queryClient.setQueryData([queryKeys.playersSummary, "compact"], newData)
            }

            return { previousData }
        },

        onError: (_err, _variables, context) => {
            // Roll back on error
            if (context?.previousData) {
                queryClient.setQueryData(
                    [queryKeys.playersSummary, "compact"],
                    context.previousData
                )
            }
        },

        onSettled: () => {
            // Always refetch to ensure consistency
            void queryClient.invalidateQueries({ queryKey: [queryKeys.characters] })
            void queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            void queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] })
        },
    })
}

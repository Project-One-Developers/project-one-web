"use client"

import {
    addCharacterAction,
    addPlayerAction,
    deleteCharacterAction,
    deletePlayerAction,
    editCharacterAction,
    editPlayerAction,
    getCharacterAction,
    getCharacterListAction,
    getCharactersWithPlayerListAction,
    getPlayerWithCharactersListAction,
    getPlayersWithoutCharactersAction,
} from "@/actions/characters"
import { getRosterSummaryAction } from "@/actions/summary"
import {
    DroptimizerWarn,
    RaiderioWarn,
    WowAuditWarn,
    type CharacterSummary,
    type EditCharacter,
    type EditPlayer,
    type NewCharacter,
    type NewPlayer,
} from "@/shared/types/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "./keys"

// Type for enriched player summary (used in roster page)
export type PlayerWithCharactersSummary = {
    id: string
    name: string
    charsSummary: CharacterSummary[]
}

// ============== QUERIES ==============

export function usePlayersWithCharacters() {
    return useQuery({
        queryKey: [queryKeys.playersWithCharacters],
        queryFn: () => getPlayerWithCharactersListAction(),
    })
}

export function usePlayersWithoutCharacters() {
    return useQuery({
        queryKey: [queryKeys.playersWithoutCharacters],
        queryFn: () => getPlayersWithoutCharactersAction(),
    })
}

export function useCharacters() {
    return useQuery({
        queryKey: [queryKeys.characters],
        queryFn: () => getCharacterListAction(),
    })
}

export function useCharactersWithPlayer() {
    return useQuery({
        queryKey: [queryKeys.characters, "withPlayer"],
        queryFn: () => getCharactersWithPlayerListAction(),
    })
}

export function useCharacter(id: string | undefined) {
    return useQuery({
        queryKey: [queryKeys.character, id],
        queryFn: () => {
            if (!id) throw new Error("No character id provided")
            return getCharacterAction(id)
        },
        enabled: !!id,
    })
}

// Player summary with real character data from droptimizers, wowaudit, and raiderio
export function usePlayersSummary() {
    return useQuery({
        queryKey: [queryKeys.playersSummary],
        queryFn: async (): Promise<PlayerWithCharactersSummary[]> => {
            const [playersWithChars, playersWithoutChars, rosterSummary] =
                await Promise.all([
                    getPlayerWithCharactersListAction(),
                    getPlayersWithoutCharactersAction(),
                    getRosterSummaryAction(),
                ])

            // Map character summaries by character ID for quick lookup
            const summaryByCharId = new Map(
                rosterSummary.map((cs) => [cs.character.id, cs])
            )

            // Build players with real character summaries
            const playersWithCharacters: PlayerWithCharactersSummary[] =
                playersWithChars.map((player) => ({
                    id: player.id,
                    name: player.name,
                    charsSummary: player.characters.map((char) => {
                        const summary = summaryByCharId.get(char.id)
                        if (summary) {
                            return summary
                        }
                        // Fallback for characters without summary data
                        return {
                            character: {
                                ...char,
                                player: { id: player.id, name: player.name },
                            },
                            itemLevel: "?",
                            weeklyChest: [],
                            tierset: [],
                            currencies: [],
                            warnDroptimizer: DroptimizerWarn.NotImported,
                            warnWowAudit: WowAuditWarn.NotTracked,
                            warnRaiderio: RaiderioWarn.NotTracked,
                        }
                    }),
                }))

            // Players without characters
            const playersWithoutCharsFormatted: PlayerWithCharactersSummary[] =
                playersWithoutChars.map((player) => ({
                    id: player.id,
                    name: player.name,
                    charsSummary: [],
                }))

            return [...playersWithCharacters, ...playersWithoutCharsFormatted]
        },
    })
}

// ============== MUTATIONS ==============

export function useAddPlayer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (player: NewPlayer) => addPlayerAction(player),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithoutCharacters],
            })
            queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] })
        },
    })
}

export function useEditPlayer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (player: EditPlayer) => editPlayerAction(player),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] })
        },
    })
}

export function useDeletePlayer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => deletePlayerAction(id),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithoutCharacters],
            })
            queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] })
        },
    })
}

export function useAddCharacter() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (character: NewCharacter) => addCharacterAction(character),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.characters] })
            queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithoutCharacters],
            })
            queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] })
        },
    })
}

export function useEditCharacter() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (character: EditCharacter) => editCharacterAction(character),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.characters] })
            queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] })
        },
    })
}

export function useDeleteCharacter() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => deleteCharacterAction(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.characters] })
            queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithCharacters],
            })
            queryClient.invalidateQueries({
                queryKey: [queryKeys.playersWithoutCharacters],
            })
            queryClient.invalidateQueries({ queryKey: [queryKeys.playersSummary] })
        },
    })
}

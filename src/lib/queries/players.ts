"use client"

import {
    addCharacter,
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
import { getRosterSummary, getRosterSummaryCompact } from "@/actions/summary"
import {
    DroptimizerWarn,
    RaiderioWarn,
    WowAuditWarn,
    type CharacterSummary,
    type CharacterSummaryCompact,
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

// Compact version for roster page - reduces payload by ~70%
export type PlayerWithCharactersSummaryCompact = {
    id: string
    name: string
    charsSummary: CharacterSummaryCompact[]
}

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

export function useCharacterGameInfo(name?: string, realm?: string) {
    return useQuery({
        queryKey: [queryKeys.characterGameInfo, name, realm],
        queryFn: () => {
            if (!name || !realm) {
                throw new Error("Name and realm are required")
            }
            return getCharLatestGameInfo(name, realm)
        },
        enabled: !!name && !!realm,
    })
}

// Player summary with real character data from droptimizers, wowaudit, and raiderio
export function usePlayersSummary() {
    return useQuery({
        queryKey: [queryKeys.playersSummary],
        staleTime: 30000,
        queryFn: async (): Promise<PlayerWithCharactersSummary[]> => {
            const [playersWithChars, playersWithoutChars, rosterSummary] =
                await Promise.all([
                    getPlayerWithCharactersList(),
                    getPlayersWithoutCharacters(),
                    getRosterSummary(),
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

// Compact version for roster page - avoids loading full droptimizer data
export function usePlayersSummaryCompact() {
    return useQuery({
        queryKey: [queryKeys.playersSummary, "compact"],
        staleTime: 30000,
        queryFn: async (): Promise<PlayerWithCharactersSummaryCompact[]> => {
            const [playersWithChars, playersWithoutChars, rosterSummary] =
                await Promise.all([
                    getPlayerWithCharactersList(),
                    getPlayersWithoutCharacters(),
                    getRosterSummaryCompact(),
                ])

            // Map character summaries by character ID for quick lookup
            const summaryByCharId = new Map(
                rosterSummary.map((cs) => [cs.character.id, cs])
            )

            // Build players with compact character summaries
            const playersWithCharacters: PlayerWithCharactersSummaryCompact[] =
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
                            tiersetCount: 0,
                        }
                    }),
                }))

            // Players without characters
            const playersWithoutCharsFormatted: PlayerWithCharactersSummaryCompact[] =
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

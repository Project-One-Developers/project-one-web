"use server"

import {
    addCharacter,
    addPlayer,
    deleteCharacter,
    deletePlayer,
    editCharacter,
    editPlayer,
    getCharactersList,
    getCharactersWithPlayerList,
    getCharacterWithPlayerById,
    getPlayerById,
    getPlayerWithCharactersList,
    getPlayersWithoutCharactersList,
} from "@/db/repositories/characters"
import { getDroptimizerLastByChar } from "@/db/repositories/droptimizer"
import { getLastRaiderioInfo } from "@/db/repositories/raiderio"
import { getLastWowAuditInfo } from "@/db/repositories/wowaudit"
import type {
    Character,
    CharacterGameInfo,
    CharacterWithPlayer,
    EditCharacter,
    EditPlayer,
    NewCharacter,
    NewPlayer,
    Player,
    PlayerWithCharacters,
} from "@/shared/types/types"

// ============== CHARACTERS ==============

export async function addCharacterAction(
    character: NewCharacter
): Promise<CharacterWithPlayer | null> {
    const id = await addCharacter(character)
    return await getCharacterWithPlayerById(id)
}

export async function getCharacterAction(
    id: string
): Promise<CharacterWithPlayer | null> {
    return await getCharacterWithPlayerById(id)
}

export async function getCharacterListAction(): Promise<Character[]> {
    return await getCharactersList()
}

export async function getCharactersWithPlayerListAction(): Promise<
    CharacterWithPlayer[]
> {
    return await getCharactersWithPlayerList()
}

export async function deleteCharacterAction(id: string): Promise<void> {
    return await deleteCharacter(id)
}

export async function editCharacterAction(
    edited: EditCharacter
): Promise<CharacterWithPlayer | null> {
    await editCharacter(edited)
    return await getCharacterWithPlayerById(edited.id)
}

// ============== PLAYERS ==============

export async function addPlayerAction(player: NewPlayer): Promise<Player | null> {
    const id = await addPlayer(player)
    return await getPlayerById(id)
}

export async function deletePlayerAction(playerId: string): Promise<void> {
    return await deletePlayer(playerId)
}

export async function editPlayerAction(edited: EditPlayer): Promise<Player | null> {
    await editPlayer(edited)
    return await getPlayerById(edited.id)
}

export async function getPlayerWithCharactersListAction(): Promise<
    PlayerWithCharacters[]
> {
    return await getPlayerWithCharactersList()
}

export async function getPlayersWithoutCharactersAction(): Promise<Player[]> {
    return await getPlayersWithoutCharactersList()
}

// ============== CHARACTER INFO ==============

export async function getCharLatestGameInfoAction(
    charName: string,
    charRealm: string
): Promise<CharacterGameInfo> {
    const [lastDroptimizer, lastWowAudit, lastRaiderio] = await Promise.all([
        getDroptimizerLastByChar(charName, charRealm),
        getLastWowAuditInfo(charName, charRealm),
        getLastRaiderioInfo(charName, charRealm),
    ])

    return {
        droptimizer: lastDroptimizer,
        wowaudit: lastWowAudit,
        raiderio: lastRaiderio,
    }
}

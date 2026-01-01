"use server"

import { characterService } from "@/services/character/character.service"
import { playerService } from "@/services/player/player.service"
import type {
    Character,
    CharacterGameInfo,
    CharacterWithPlayer,
    EditCharacter,
    EditPlayer,
    NewCharacter,
    NewCharacterWithoutClass,
    NewPlayer,
    Player,
    PlayerWithCharacters,
} from "@/shared/models/character.model"

// ============== CHARACTERS ==============

export async function addCharacter(
    character: NewCharacter
): Promise<CharacterWithPlayer | null> {
    return characterService.add(character)
}

export async function addCharacterWithSync(
    character: NewCharacterWithoutClass
): Promise<CharacterWithPlayer | null> {
    return characterService.addWithSync(character)
}

export async function getCharacter(id: string): Promise<CharacterWithPlayer | null> {
    return characterService.getById(id)
}

export async function getCharacterList(): Promise<Character[]> {
    return characterService.getList()
}

export async function getCharactersWithPlayerList(): Promise<CharacterWithPlayer[]> {
    return characterService.getWithPlayerList()
}

export async function deleteCharacter(id: string): Promise<void> {
    return characterService.delete(id)
}

export async function editCharacter(
    edited: EditCharacter
): Promise<CharacterWithPlayer | null> {
    return characterService.edit(edited)
}

// ============== PLAYERS ==============

export async function addPlayer(player: NewPlayer): Promise<Player | null> {
    return playerService.add(player)
}

export async function deletePlayer(playerId: string): Promise<void> {
    return playerService.delete(playerId)
}

export async function editPlayer(edited: EditPlayer): Promise<Player | null> {
    return playerService.edit(edited)
}

export async function getPlayerWithCharactersList(): Promise<PlayerWithCharacters[]> {
    return playerService.getWithCharactersList()
}

export async function getPlayersWithoutCharacters(): Promise<Player[]> {
    return playerService.getWithoutCharacters()
}

// ============== CHARACTER INFO ==============

export async function getCharLatestGameInfo(
    characterId: string
): Promise<CharacterGameInfo> {
    return characterService.getLatestGameInfo(characterId)
}

// ============== CHARACTER MEDIA ==============

export async function getCharacterRenderUrl(
    name: string,
    realm: string
): Promise<string | null> {
    return characterService.getRenderUrl(name, realm)
}

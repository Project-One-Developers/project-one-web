"use server"

import { characterRepo } from "@/db/repositories/characters"
import { droptimizerRepo } from "@/db/repositories/droptimizer"
import { playerRepo } from "@/db/repositories/player.repo"
import { raiderioRepo } from "@/db/repositories/raiderio"
import { wowauditRepo } from "@/db/repositories/wowaudit"
import { fetchCharacterMedia } from "@/lib/blizzard/blizzard-api"
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
} from "@/shared/models/character.model"

// ============== CHARACTERS ==============

export async function addCharacter(
    character: NewCharacter
): Promise<CharacterWithPlayer | null> {
    const id = await characterRepo.add(character)
    return await characterRepo.getWithPlayerById(id)
}

export async function getCharacter(id: string): Promise<CharacterWithPlayer | null> {
    return await characterRepo.getWithPlayerById(id)
}

export async function getCharacterList(): Promise<Character[]> {
    return await characterRepo.getList()
}

export async function getCharactersWithPlayerList(): Promise<CharacterWithPlayer[]> {
    return await characterRepo.getWithPlayerList()
}

export async function deleteCharacter(id: string): Promise<void> {
    await characterRepo.delete(id)
}

export async function editCharacter(
    edited: EditCharacter
): Promise<CharacterWithPlayer | null> {
    await characterRepo.edit(edited)
    return await characterRepo.getWithPlayerById(edited.id)
}

// ============== PLAYERS ==============

export async function addPlayer(player: NewPlayer): Promise<Player | null> {
    const id = await playerRepo.add(player)
    return await playerRepo.getById(id)
}

export async function deletePlayer(playerId: string): Promise<void> {
    await playerRepo.delete(playerId)
}

export async function editPlayer(edited: EditPlayer): Promise<Player | null> {
    await playerRepo.edit(edited)
    return await playerRepo.getById(edited.id)
}

export async function getPlayerWithCharactersList(): Promise<PlayerWithCharacters[]> {
    return await playerRepo.getWithCharactersList()
}

export async function getPlayersWithoutCharacters(): Promise<Player[]> {
    return await playerRepo.getWithoutCharactersList()
}

// ============== CHARACTER INFO ==============

export async function getCharLatestGameInfo(
    charName: string,
    charRealm: string
): Promise<CharacterGameInfo> {
    const [lastDroptimizer, lastWowAudit, lastRaiderio] = await Promise.all([
        droptimizerRepo.getLastByChar(charName, charRealm),
        wowauditRepo.getByChar(charName, charRealm),
        raiderioRepo.getByChar(charName, charRealm),
    ])

    return {
        droptimizer: lastDroptimizer,
        wowaudit: lastWowAudit,
        raiderio: lastRaiderio,
    }
}

// ============== CHARACTER MEDIA ==============

/**
 * Fetch character render URL from Battle.net API
 * Returns the main-raw URL (transparent full body render) or null if not available
 */
export async function getCharacterRenderUrl(
    name: string,
    realm: string
): Promise<string | null> {
    return await fetchCharacterMedia(name, realm)
}

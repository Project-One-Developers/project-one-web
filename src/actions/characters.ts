"use server"

import { isOfficer, requireOfficer } from "@/lib/auth-helpers"
import { stripOfficerFields } from "@/lib/officer-data"
import { characterService } from "@/services/character.service"
import { playerService } from "@/services/player.service"
import type {
    Character,
    CharacterWithGameInfo,
    CharacterWithPlayer,
    EditCharacterData,
    EditPlayer,
    NewCharacterWithoutClass,
    NewPlayer,
    Player,
    PlayerWithCharacters,
} from "@/shared/models/character.models"

// ============== CHARACTERS ==============

export async function addCharacterWithSync(
    character: NewCharacterWithoutClass
): Promise<CharacterWithPlayer | null> {
    await requireOfficer()
    return characterService.addWithSync(character)
}

export async function getCharacterWithGameInfo(
    id: string
): Promise<CharacterWithGameInfo | null> {
    const data = await characterService.getByIdWithGameInfo(id)
    if (!data) {
        return null
    }

    if (!(await isOfficer())) {
        return stripOfficerFields(data)
    }

    return data
}

export async function getCharacterList(): Promise<Character[]> {
    const characters = await characterService.getList()

    if (!(await isOfficer())) {
        return stripOfficerFields(characters)
    }
    return characters
}

export async function deleteCharacter(id: string): Promise<void> {
    await requireOfficer()
    return characterService.delete(id)
}

export async function editCharacter(
    id: string,
    data: EditCharacterData
): Promise<CharacterWithPlayer | null> {
    await requireOfficer()
    return characterService.edit(id, data)
}

// ============== PLAYERS ==============

export async function addPlayer(player: NewPlayer): Promise<Player | null> {
    await requireOfficer()
    return playerService.add(player)
}

export async function deletePlayer(playerId: string): Promise<void> {
    await requireOfficer()
    return playerService.delete(playerId)
}

export async function editPlayer(edited: EditPlayer): Promise<Player | null> {
    await requireOfficer()
    return playerService.edit(edited)
}

export async function getPlayerWithCharactersList(): Promise<PlayerWithCharacters[]> {
    const players = await playerService.getWithCharactersList()

    if (!(await isOfficer())) {
        return players.map((player) => ({
            ...player,
            characters: stripOfficerFields(player.characters),
        }))
    }
    return players
}

// ============== CHARACTER MEDIA ==============

export async function getCharacterRenderUrl(
    name: string,
    realm: string
): Promise<string | null> {
    return characterService.getRenderUrl(name, realm)
}

// ============== CHARACTER ASSIGNMENT ==============

export async function assignCharacterToPlayer(
    characterId: string,
    targetPlayerId: string
): Promise<CharacterWithPlayer | null> {
    await requireOfficer()
    return characterService.assignToPlayer(characterId, targetPlayerId)
}

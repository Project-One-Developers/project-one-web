"use server"

import { isOfficer, requireOfficer } from "@/lib/auth-helpers"
import { safeAction } from "@/lib/errors/action-wrapper"
import { stripOfficerFields } from "@/lib/officer-data"
import { characterService } from "@/services/character.service"
import { playerService } from "@/services/player.service"
import type {
    CharacterWithPlayer,
    EditCharacterData,
    EditPlayer,
    NewCharacter,
    NewCharacterWithoutClass,
    NewPlayer,
    Player,
} from "@/shared/models/character.models"

// ============== CHARACTERS ==============

export const addCharacterWithSync = safeAction(
    async (character: NewCharacterWithoutClass): Promise<CharacterWithPlayer | null> => {
        await requireOfficer()
        return characterService.addWithSync(character)
    }
)

export const addCharacterWithManualClass = safeAction(
    async (character: NewCharacter): Promise<CharacterWithPlayer | null> => {
        await requireOfficer()
        return characterService.addWithManualClass(character)
    }
)

export const getCharacterWithGameInfo = safeAction(async (id: string) => {
    const data = await characterService.getByIdWithGameInfo(id)
    if (!data) {
        return null
    }

    if (!(await isOfficer())) {
        return stripOfficerFields(data)
    }

    return data
})

export const getCharacterList = safeAction(async () => {
    const characters = await characterService.getList()

    if (!(await isOfficer())) {
        return stripOfficerFields(characters)
    }
    return characters
})

export const deleteCharacter = safeAction(async (id: string): Promise<void> => {
    await requireOfficer()
    return characterService.delete(id)
})

export const editCharacter = safeAction(
    async (id: string, data: EditCharacterData): Promise<CharacterWithPlayer | null> => {
        await requireOfficer()
        return characterService.edit(id, data)
    }
)

// ============== PLAYERS ==============

export const addPlayer = safeAction(async (player: NewPlayer): Promise<Player | null> => {
    await requireOfficer()
    return playerService.add(player)
})

export const deletePlayer = safeAction(async (playerId: string): Promise<void> => {
    await requireOfficer()
    return playerService.delete(playerId)
})

export const editPlayer = safeAction(
    async (edited: EditPlayer): Promise<Player | null> => {
        await requireOfficer()
        return playerService.edit(edited)
    }
)

export const getPlayerWithCharactersList = safeAction(async () => {
    const players = await playerService.getWithCharactersList()

    if (!(await isOfficer())) {
        return players.map((player) => ({
            ...player,
            characters: stripOfficerFields(player.characters),
        }))
    }
    return players
})

// ============== CHARACTER MEDIA ==============

export const getCharacterRenderUrl = safeAction(async (name: string, realm: string) => {
    return characterService.getRenderUrl(name, realm)
})

// ============== CHARACTER ASSIGNMENT ==============

export const assignCharacterToPlayer = safeAction(
    async (
        characterId: string,
        targetPlayerId: string
    ): Promise<CharacterWithPlayer | null> => {
        await requireOfficer()
        return characterService.assignToPlayer(characterId, targetPlayerId)
    }
)

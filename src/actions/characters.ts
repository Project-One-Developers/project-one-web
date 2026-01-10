"use server"

import { syncCharacterInternal } from "@/actions/blizzard"
import { blizzardRepo } from "@/db/repositories/blizzard"
import { characterRepo } from "@/db/repositories/characters"
import { droptimizerRepo } from "@/db/repositories/droptimizer"
import { playerRepo } from "@/db/repositories/player.repo"
import { isOfficer, requireOfficer } from "@/lib/auth-helpers"
import { BlizzardApiError, NotFoundError } from "@/lib/errors"
import { safeAction } from "@/lib/errors/action-wrapper"
import { logger } from "@/lib/logger"
import { stripOfficerFields } from "@/lib/officer-data"
import { fetchCharacterMedia, fetchCharacterProfile } from "@/lib/server/blizzard-api"
import { mapBlizzardClassId } from "@/shared/libs/blizzard-mappings"
import { s } from "@/shared/libs/string-utils"
import type {
    Character,
    CharacterWithGameInfo,
    CharacterWithPlayer,
    EditCharacterData,
    EditPlayer,
    NewCharacter,
    NewCharacterWithoutClass,
    NewPlayer,
    Player,
    PlayerWithCharacters,
} from "@/shared/models/character.models"

// ============== CHARACTERS ==============

export const addCharacterWithSync = safeAction(
    async (character: NewCharacterWithoutClass): Promise<CharacterWithPlayer | null> => {
        await requireOfficer()

        logger.info(
            "Action",
            `Adding character with sync: ${character.name}-${character.realm}`
        )

        // Fetch character profile from Blizzard to get the class
        const profile = await fetchCharacterProfile(character.name, character.realm)
        if (!profile) {
            throw new NotFoundError(
                "Character",
                `${character.name}-${character.realm}. Please check the name and realm are correct.`
            )
        }

        const wowClass = mapBlizzardClassId(profile.character_class.id)
        if (!wowClass) {
            throw new BlizzardApiError(
                `Unknown class ID ${s(profile.character_class.id)} for ${character.name}`
            )
        }

        // Add character to database with the fetched class
        const newCharacter: NewCharacter = {
            ...character,
            class: wowClass,
        }
        const id = await characterRepo.add(newCharacter)

        // Sync gear and other Blizzard data before returning
        // Pass the already-fetched profile to avoid duplicate API call
        try {
            await syncCharacterInternal(id, character.name, character.realm, profile)
        } catch (err: unknown) {
            logger.error(
                "Action",
                `Failed to sync Blizzard data for ${character.name}: ${s(err)}`
            )
        }

        logger.info(
            "Action",
            `Character ${character.name} (${wowClass}) added successfully`
        )

        return characterRepo.getWithPlayerById(id)
    }
)

export const addCharacterWithManualClass = safeAction(
    async (character: NewCharacter): Promise<CharacterWithPlayer | null> => {
        await requireOfficer()

        logger.info(
            "Action",
            `Adding character with manual class: ${character.name}-${character.realm} (${character.class})`
        )

        const id = await characterRepo.add(character)

        // Try to sync Blizzard data (non-blocking, best effort)
        try {
            await syncCharacterInternal(id, character.name, character.realm)
        } catch (err: unknown) {
            logger.warn(
                "Action",
                `Could not sync Blizzard data for ${character.name}: ${s(err)}`
            )
        }

        logger.info(
            "Action",
            `Character ${character.name} (${character.class}) added with manual class`
        )

        return characterRepo.getWithPlayerById(id)
    }
)

export const getCharacterWithGameInfo = safeAction(
    async (id: string): Promise<CharacterWithGameInfo | null> => {
        const [character, droptimizer, blizzard] = await Promise.all([
            characterRepo.getWithPlayerById(id),
            droptimizerRepo.getByCharacterId(id),
            blizzardRepo.getByCharId(id),
        ])

        if (!character) {
            return null
        }

        const data: CharacterWithGameInfo = {
            ...character,
            gameInfo: { droptimizer, blizzard },
        }

        if (!(await isOfficer())) {
            return stripOfficerFields(data)
        }

        return data
    }
)

export const getCharacterList = safeAction(async (): Promise<Character[]> => {
    const characters = await characterRepo.getList()

    if (!(await isOfficer())) {
        return stripOfficerFields(characters)
    }
    return characters
})

export const deleteCharacter = safeAction(async (id: string): Promise<void> => {
    await requireOfficer()
    await characterRepo.delete(id)
})

export const editCharacter = safeAction(
    async (id: string, data: EditCharacterData): Promise<CharacterWithPlayer | null> => {
        await requireOfficer()
        await characterRepo.edit(id, data)
        return characterRepo.getWithPlayerById(id)
    }
)

// ============== PLAYERS ==============

export const addPlayer = safeAction(async (player: NewPlayer): Promise<Player | null> => {
    await requireOfficer()
    const id = await playerRepo.add(player)
    return playerRepo.getById(id)
})

export const deletePlayer = safeAction(async (playerId: string): Promise<void> => {
    await requireOfficer()
    await playerRepo.delete(playerId)
})

export const editPlayer = safeAction(
    async (edited: EditPlayer): Promise<Player | null> => {
        await requireOfficer()
        await playerRepo.edit(edited)
        return playerRepo.getById(edited.id)
    }
)

export const getPlayerWithCharactersList = safeAction(
    async (): Promise<PlayerWithCharacters[]> => {
        const players = await playerRepo.getWithCharactersList()

        if (!(await isOfficer())) {
            return players.map((player) => ({
                ...player,
                characters: stripOfficerFields(player.characters),
            }))
        }
        return players
    }
)

// ============== CHARACTER MEDIA ==============

export const getCharacterRenderUrl = safeAction(
    async (name: string, realm: string): Promise<string | null> => {
        return fetchCharacterMedia(name, realm)
    }
)

// ============== CHARACTER ASSIGNMENT ==============

export const assignCharacterToPlayer = safeAction(
    async (
        characterId: string,
        targetPlayerId: string
    ): Promise<CharacterWithPlayer | null> => {
        await requireOfficer()
        await characterRepo.assignToPlayer(characterId, targetPlayerId)
        return characterRepo.getWithPlayerById(characterId)
    }
)

import "server-only"
import { blizzardRepo } from "@/db/repositories/blizzard"
import { characterRepo } from "@/db/repositories/characters"
import { droptimizerRepo } from "@/db/repositories/droptimizer"
import { logger } from "@/lib/logger"
import { blizzardService } from "@/services/blizzard.service"
import { fetchCharacterMedia, fetchCharacterProfile } from "@/services/libs/blizzard-api"
import { mapBlizzardClassId } from "@/shared/libs/blizzard-mappings"
import { s } from "@/shared/libs/string-utils"
import type {
    Character,
    CharacterWithGameInfo,
    CharacterWithPlayer,
    EditCharacterData,
    NewCharacter,
    NewCharacterWithoutClass,
} from "@/shared/models/character.models"

export const characterService = {
    /**
     * Get character with player info and all game data (droptimizer + blizzard) in one call
     */
    getByIdWithGameInfo: async (id: string): Promise<CharacterWithGameInfo | null> => {
        const [character, droptimizer, blizzard] = await Promise.all([
            characterRepo.getWithPlayerById(id),
            droptimizerRepo.getByCharacterId(id),
            blizzardRepo.getByCharId(id),
        ])

        if (!character) {
            return null
        }

        return {
            ...character,
            gameInfo: { droptimizer, blizzard },
        }
    },

    getList: async (): Promise<Character[]> => {
        return characterRepo.getList()
    },

    getWithPlayerList: async (): Promise<CharacterWithPlayer[]> => {
        return characterRepo.getWithPlayerList()
    },

    add: async (character: NewCharacter): Promise<CharacterWithPlayer | null> => {
        const id = await characterRepo.add(character)
        return characterRepo.getWithPlayerById(id)
    },

    /**
     * Add a character by fetching class from Blizzard API, then sync gear data.
     * This eliminates the need for manual class selection.
     */
    addWithSync: async (
        character: NewCharacterWithoutClass
    ): Promise<CharacterWithPlayer | null> => {
        logger.info(
            "CharacterService",
            `Adding character with sync: ${character.name}-${character.realm}`
        )

        // Fetch character profile from Blizzard to get the class
        const profile = await fetchCharacterProfile(character.name, character.realm)
        if (!profile) {
            throw new Error(
                `Character "${character.name}" not found on "${character.realm}". Please check the name and realm are correct.`
            )
        }

        const wowClass = mapBlizzardClassId(profile.character_class.id)
        if (!wowClass) {
            throw new Error(
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
            await blizzardService.syncCharacter(
                id,
                character.name,
                character.realm,
                profile
            )
        } catch (err: unknown) {
            logger.error(
                "CharacterService",
                `Failed to sync Blizzard data for ${character.name}: ${s(err)}`
            )
        }

        logger.info(
            "CharacterService",
            `Character ${character.name} (${wowClass}) added successfully`
        )

        return characterRepo.getWithPlayerById(id)
    },

    edit: async (
        id: string,
        data: EditCharacterData
    ): Promise<CharacterWithPlayer | null> => {
        await characterRepo.edit(id, data)
        return characterRepo.getWithPlayerById(id)
    },

    delete: async (id: string): Promise<void> => {
        await characterRepo.delete(id)
    },

    /**
     * Fetch character render URL from Battle.net API
     * Returns the main-raw URL (transparent full body render) or null if not available
     */
    getRenderUrl: async (name: string, realm: string): Promise<string | null> => {
        return fetchCharacterMedia(name, realm)
    },

    /**
     * Assign a character to a different player
     */
    assignToPlayer: async (
        characterId: string,
        targetPlayerId: string
    ): Promise<CharacterWithPlayer | null> => {
        await characterRepo.assignToPlayer(characterId, targetPlayerId)
        return characterRepo.getWithPlayerById(characterId)
    },
}

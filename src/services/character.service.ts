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
    CharacterGameInfo,
    CharacterWithPlayer,
    EditCharacter,
    NewCharacter,
    NewCharacterWithoutClass,
} from "@/shared/models/character.models"

export const characterService = {
    getById: async (id: string): Promise<CharacterWithPlayer | null> => {
        return characterRepo.getWithPlayerById(id)
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

    edit: async (edited: EditCharacter): Promise<CharacterWithPlayer | null> => {
        await characterRepo.edit(edited)
        return characterRepo.getWithPlayerById(edited.id)
    },

    delete: async (id: string): Promise<void> => {
        await characterRepo.delete(id)
    },

    /**
     * Get latest game info (droptimizer + blizzard data) for a character
     */
    getLatestGameInfo: async (characterId: string): Promise<CharacterGameInfo> => {
        const [lastDroptimizer, lastBlizzard] = await Promise.all([
            droptimizerRepo.getByCharacterId(characterId),
            blizzardRepo.getByCharId(characterId),
        ])

        return {
            droptimizer: lastDroptimizer,
            blizzard: lastBlizzard,
        }
    },

    /**
     * Fetch character render URL from Battle.net API
     * Returns the main-raw URL (transparent full body render) or null if not available
     */
    getRenderUrl: async (name: string, realm: string): Promise<string | null> => {
        return fetchCharacterMedia(name, realm)
    },
}

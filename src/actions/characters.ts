"use server"

import { match } from "ts-pattern"
import { blizzardRepo } from "@/db/repositories/blizzard"
import { characterRepo } from "@/db/repositories/characters"
import { droptimizerRepo } from "@/db/repositories/droptimizer"
import { playerRepo } from "@/db/repositories/player.repo"
import { logger } from "@/lib/logger"
import {
    fetchCharacterMedia,
    fetchCharacterProfile,
} from "@/services/blizzard/blizzard-api"
import { s } from "@/shared/libs/safe-stringify"
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
import type { WowClassName } from "@/shared/models/wow.model"
import { syncCharacterBlizzard } from "./blizzard"

// ============== CHARACTERS ==============

export async function addCharacter(
    character: NewCharacter
): Promise<CharacterWithPlayer | null> {
    const id = await characterRepo.add(character)
    return await characterRepo.getWithPlayerById(id)
}

const mapBlizzardClassId = (classId: number): WowClassName | null =>
    match<number, WowClassName | null>(classId)
        .with(1, () => "Warrior")
        .with(2, () => "Paladin")
        .with(3, () => "Hunter")
        .with(4, () => "Rogue")
        .with(5, () => "Priest")
        .with(6, () => "Death Knight")
        .with(7, () => "Shaman")
        .with(8, () => "Mage")
        .with(9, () => "Warlock")
        .with(10, () => "Monk")
        .with(11, () => "Druid")
        .with(12, () => "Demon Hunter")
        .with(13, () => "Evoker")
        .otherwise(() => null)

/**
 * Add a character by fetching class from Blizzard API, then sync gear data.
 * This eliminates the need for manual class selection.
 */
export async function addCharacterWithSync(
    character: NewCharacterWithoutClass
): Promise<CharacterWithPlayer | null> {
    logger.info(
        "Characters",
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
        await syncCharacterBlizzard(id, character.name, character.realm, profile)
    } catch (err: unknown) {
        logger.error(
            "Characters",
            `Failed to sync Blizzard data for ${character.name}: ${s(err)}`
        )
    }

    logger.info(
        "Characters",
        `Character ${character.name} (${wowClass}) added successfully`
    )

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
    characterId: string
): Promise<CharacterGameInfo> {
    const [lastDroptimizer, lastBlizzard] = await Promise.all([
        droptimizerRepo.getByCharacterId(characterId),
        blizzardRepo.getByCharId(characterId),
    ])

    return {
        droptimizer: lastDroptimizer,
        blizzard: lastBlizzard,
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

"use server"

import { match } from "ts-pattern"
import { blizzardRepo } from "@/db/repositories/blizzard"
import { characterRepo } from "@/db/repositories/characters"
import { droptimizerRepo } from "@/db/repositories/droptimizer"
import { playerRepo } from "@/db/repositories/player.repo"
import { fetchCharacterMedia, fetchCharacterProfile } from "@/lib/blizzard/blizzard-api"
import { logger } from "@/lib/logger"
import { fail, ok, tryCatch, tryCatchVoid } from "@/lib/result"
import { s } from "@/lib/safe-stringify"
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
import type { Result, VoidResult } from "@/shared/types/types"
import { syncCharacterBlizzard } from "./blizzard"

// ============== CHARACTERS ==============

export async function addCharacter(
    character: NewCharacter
): Promise<Result<CharacterWithPlayer>> {
    return tryCatch(async () => {
        const id = await characterRepo.add(character)
        const result = await characterRepo.getWithPlayerById(id)
        if (!result) {
            throw new Error("Character was created but could not be retrieved")
        }
        return result
    }, "Characters")
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
): Promise<Result<CharacterWithPlayer>> {
    logger.info(
        "Characters",
        `Adding character with sync: ${character.name}-${character.realm}`
    )

    // Fetch character profile from Blizzard to get the class
    const profile = await fetchCharacterProfile(character.name, character.realm)
    if (!profile) {
        return fail(
            `Character "${character.name}" not found on "${character.realm}". Please check the name and realm are correct.`,
            "Characters"
        )
    }

    const wowClass = mapBlizzardClassId(profile.character_class.id)
    if (!wowClass) {
        return fail(
            `Unknown class ID ${s(profile.character_class.id)} for ${character.name}`,
            "Characters"
        )
    }

    // Add character to database with the fetched class
    const newCharacter: NewCharacter = {
        ...character,
        class: wowClass,
    }

    try {
        const id = await characterRepo.add(newCharacter)

        // Sync gear and other Blizzard data in the background (don't block)
        // Pass the already-fetched profile to avoid duplicate API call
        void syncCharacterBlizzard(id, character.name, character.realm, profile).catch(
            (err: unknown) => {
                logger.error(
                    "Characters",
                    `Failed to sync Blizzard data for ${character.name}: ${s(err)}`
                )
            }
        )

        logger.info(
            "Characters",
            `Character ${character.name} (${wowClass}) added successfully`
        )

        const result = await characterRepo.getWithPlayerById(id)
        if (!result) {
            return fail("Character was created but could not be retrieved", "Characters")
        }
        return ok(result)
    } catch (error) {
        return fail(
            `Failed to add character: ${error instanceof Error ? error.message : "Unknown error"}`,
            "Characters"
        )
    }
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

export async function deleteCharacter(id: string): Promise<VoidResult> {
    return tryCatchVoid(
        () => characterRepo.delete(id),
        "Characters",
        "Failed to delete character"
    )
}

export async function editCharacter(
    edited: EditCharacter
): Promise<Result<CharacterWithPlayer>> {
    return tryCatch(async () => {
        await characterRepo.edit(edited)
        const result = await characterRepo.getWithPlayerById(edited.id)
        if (!result) {
            throw new Error("Character was updated but could not be retrieved")
        }
        return result
    }, "Characters")
}

// ============== PLAYERS ==============

export async function addPlayer(player: NewPlayer): Promise<Result<Player>> {
    return tryCatch(async () => {
        const id = await playerRepo.add(player)
        const result = await playerRepo.getById(id)
        if (!result) {
            throw new Error("Player was created but could not be retrieved")
        }
        return result
    }, "Players")
}

export async function deletePlayer(playerId: string): Promise<VoidResult> {
    return tryCatchVoid(
        () => playerRepo.delete(playerId),
        "Players",
        "Failed to delete player"
    )
}

export async function editPlayer(edited: EditPlayer): Promise<Result<Player>> {
    return tryCatch(async () => {
        await playerRepo.edit(edited)
        const result = await playerRepo.getById(edited.id)
        if (!result) {
            throw new Error("Player was updated but could not be retrieved")
        }
        return result
    }, "Players")
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

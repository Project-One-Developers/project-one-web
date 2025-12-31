"use server"

import { match } from "ts-pattern"
import { z } from "zod"
import { blizzardRepo } from "@/db/repositories/blizzard"
import { characterRepo } from "@/db/repositories/characters"
import { droptimizerRepo } from "@/db/repositories/droptimizer"
import { playerRepo } from "@/db/repositories/player.repo"
import { fetchCharacterMedia, fetchCharacterProfile } from "@/lib/blizzard/blizzard-api"
import { logger } from "@/lib/logger"
import { ActionError, authActionClient } from "@/lib/safe-action"
import { s } from "@/lib/safe-stringify"
import {
    editCharacterSchema,
    editPlayerSchema,
    newCharacterSchema,
    newCharacterWithoutClassSchema,
    newPlayerSchema,
    type Character,
    type CharacterGameInfo,
    type CharacterWithPlayer,
    type Player,
    type PlayerWithCharacters,
} from "@/shared/models/character.model"
import type { WowClassName } from "@/shared/models/wow.model"
import { syncCharacterBlizzard } from "./blizzard"

// ============== CHARACTERS ==============

export const addCharacter = authActionClient
    .inputSchema(newCharacterSchema)
    .action(async ({ parsedInput }) => {
        const id = await characterRepo.add(parsedInput)
        const result = await characterRepo.getWithPlayerById(id)
        if (!result) {
            throw new ActionError("Character was created but could not be retrieved")
        }
        return result
    })

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
export const addCharacterWithSync = authActionClient
    .inputSchema(newCharacterWithoutClassSchema)
    .action(async ({ parsedInput }) => {
        logger.info(
            "Characters",
            `Adding character with sync: ${parsedInput.name}-${parsedInput.realm}`
        )

        // Fetch character profile from Blizzard to get the class
        const profile = await fetchCharacterProfile(parsedInput.name, parsedInput.realm)
        if (!profile) {
            throw new ActionError(
                `Character "${parsedInput.name}" not found on "${parsedInput.realm}". Please check the name and realm are correct.`
            )
        }

        const wowClass = mapBlizzardClassId(profile.character_class.id)
        if (!wowClass) {
            throw new ActionError(
                `Unknown class ID ${s(profile.character_class.id)} for ${parsedInput.name}`
            )
        }

        // Add character to database with the fetched class
        const newCharacter = {
            ...parsedInput,
            class: wowClass,
        }

        const id = await characterRepo.add(newCharacter)

        // Sync gear and other Blizzard data in the background (don't block)
        // Pass the already-fetched profile to avoid duplicate API call
        void syncCharacterBlizzard(
            id,
            parsedInput.name,
            parsedInput.realm,
            profile
        ).catch((err: unknown) => {
            logger.error(
                "Characters",
                `Failed to sync Blizzard data for ${parsedInput.name}: ${s(err)}`
            )
        })

        logger.info(
            "Characters",
            `Character ${parsedInput.name} (${wowClass}) added successfully`
        )

        const result = await characterRepo.getWithPlayerById(id)
        if (!result) {
            throw new ActionError("Character was created but could not be retrieved")
        }
        return result
    })

export async function getCharacter(id: string): Promise<CharacterWithPlayer | null> {
    return await characterRepo.getWithPlayerById(id)
}

export async function getCharacterList(): Promise<Character[]> {
    return await characterRepo.getList()
}

export async function getCharactersWithPlayerList(): Promise<CharacterWithPlayer[]> {
    return await characterRepo.getWithPlayerList()
}

export const deleteCharacter = authActionClient
    .inputSchema(z.object({ id: z.uuid() }))
    .action(async ({ parsedInput }) => {
        await characterRepo.delete(parsedInput.id)
    })

export const editCharacter = authActionClient
    .inputSchema(editCharacterSchema)
    .action(async ({ parsedInput }) => {
        await characterRepo.edit(parsedInput)
        const result = await characterRepo.getWithPlayerById(parsedInput.id)
        if (!result) {
            throw new ActionError("Character was updated but could not be retrieved")
        }
        return result
    })

// ============== PLAYERS ==============

export const addPlayer = authActionClient
    .inputSchema(newPlayerSchema)
    .action(async ({ parsedInput }) => {
        const id = await playerRepo.add(parsedInput)
        const result = await playerRepo.getById(id)
        if (!result) {
            throw new ActionError("Player was created but could not be retrieved")
        }
        return result
    })

export const deletePlayer = authActionClient
    .inputSchema(z.object({ id: z.uuid() }))
    .action(async ({ parsedInput }) => {
        await playerRepo.delete(parsedInput.id)
    })

export const editPlayer = authActionClient
    .inputSchema(editPlayerSchema)
    .action(async ({ parsedInput }) => {
        await playerRepo.edit(parsedInput)
        const result = await playerRepo.getById(parsedInput.id)
        if (!result) {
            throw new ActionError("Player was updated but could not be retrieved")
        }
        return result
    })

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

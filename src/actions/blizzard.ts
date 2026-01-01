"use server"

import { type CharacterBlizzardDb } from "@/db/repositories/blizzard"
import { type CharacterProfileResponse } from "@/services/blizzard/blizzard-api"
import { blizzardService } from "@/services/blizzard/blizzard.service"
import type { RosterProgressionByDifficulty } from "@/shared/models/character.model"

export async function syncAllCharactersBlizzard(): Promise<{
    synced: number
    errors: string[]
}> {
    return blizzardService.syncAllCharacters()
}

export async function syncCharacterBlizzard(
    characterId: string,
    characterName: string,
    characterRealm: string,
    preloadedProfile?: CharacterProfileResponse
): Promise<void> {
    return blizzardService.syncCharacter(
        characterId,
        characterName,
        characterRealm,
        preloadedProfile
    )
}

export async function checkBlizzardUpdates(): Promise<{
    synced: boolean
    message: string
    result?: { synced: number; errors: string[] }
}> {
    return blizzardService.checkAndSync()
}

export async function getAllCharacterBlizzard(): Promise<CharacterBlizzardDb[]> {
    return blizzardService.getAll()
}

export async function getLastBlizzardSyncTime(): Promise<number | null> {
    return blizzardService.getLastSyncTime()
}

export async function getRosterProgression(
    raidSlug: string
): Promise<RosterProgressionByDifficulty> {
    return blizzardService.getRosterProgression(raidSlug)
}

export async function importGuildMembers(): Promise<{
    imported: number
    skipped: number
    errors: string[]
}> {
    return blizzardService.importGuildMembers()
}

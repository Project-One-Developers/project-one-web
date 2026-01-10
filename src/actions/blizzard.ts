"use server"

import { requireOfficer } from "@/lib/auth-helpers"
import { safeAction } from "@/lib/errors/action-wrapper"
import { blizzardService } from "@/services/blizzard.service"
import { type CharacterProfileResponse } from "@/services/libs/blizzard-api"
import type { RosterProgressionByDifficulty } from "@/shared/models/character.models"

export const syncAllCharactersBlizzard = safeAction(
    async (): Promise<{ synced: number; errors: string[] }> => {
        await requireOfficer()
        return blizzardService.syncAllCharacters()
    }
)

export const syncCharacterBlizzard = safeAction(
    async (
        characterId: string,
        characterName: string,
        characterRealm: string,
        preloadedProfile?: CharacterProfileResponse
    ): Promise<void> => {
        await requireOfficer()
        return blizzardService.syncCharacter(
            characterId,
            characterName,
            characterRealm,
            preloadedProfile
        )
    }
)

export const checkBlizzardUpdates = safeAction(
    async (): Promise<{
        synced: boolean
        message: string
        result?: { synced: number; errors: string[] }
    }> => {
        await requireOfficer()
        return blizzardService.checkAndSync()
    }
)

export const getRosterProgression = safeAction(
    async (raidSlug: string): Promise<RosterProgressionByDifficulty> => {
        return blizzardService.getRosterProgression(raidSlug)
    }
)

export const importGuildMembers = safeAction(
    async (): Promise<{ imported: number; skipped: number; errors: string[] }> => {
        await requireOfficer()
        return blizzardService.importGuildMembers()
    }
)

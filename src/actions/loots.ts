"use server"

import { safeAction } from "@/lib/errors/action-wrapper"
import { lootService } from "@/services/loot.service"
import type { CharacterWithGears } from "@/shared/models/character.models"
import type {
    CharAssignmentHighlights,
    LootWithAssigned,
    LootWithItem,
    NewLootManual,
} from "@/shared/models/loot.models"
import type { LootAssignmentInfo } from "@/shared/types"

export const getLootsBySessionIdWithItem = safeAction(
    async (raidSessionId: string): Promise<LootWithItem[]> => {
        return lootService.getBySessionIdWithItem(raidSessionId)
    }
)

export const getLootsBySessionIdsWithAssigned = safeAction(
    async (raidSessionIds: string[]): Promise<LootWithAssigned[]> => {
        return lootService.getBySessionIdsWithAssigned(raidSessionIds)
    }
)

export const assignLoot = safeAction(
    async (
        charId: string,
        lootId: string,
        highlights: CharAssignmentHighlights | null
    ): Promise<void> => {
        return lootService.assign(charId, lootId, highlights)
    }
)

export const unassignLoot = safeAction(async (lootId: string): Promise<void> => {
    return lootService.unassign(lootId)
})

export const deleteLoot = safeAction(async (lootId: string): Promise<void> => {
    return lootService.delete(lootId)
})

// ============== LOOT IMPORT ACTIONS ==============

export const importRcLootCsv = safeAction(
    async (
        raidSessionId: string,
        csv: string,
        importAssignedCharacter: boolean
    ): Promise<{ imported: number; errors: string[] }> => {
        return lootService.importRcLoot(raidSessionId, csv, importAssignedCharacter)
    }
)

export const importRcLootAssignments = safeAction(
    async (
        raidSessionId: string,
        csv: string
    ): Promise<{ assigned: number; warnings: string[] }> => {
        return lootService.importRcLootAssignments(raidSessionId, csv)
    }
)

export const importMrtLoot = safeAction(
    async (
        raidSessionId: string,
        data: string
    ): Promise<{ imported: number; errors: string[] }> => {
        return lootService.importMrtLoot(raidSessionId, data)
    }
)

export const addManualLoot = safeAction(
    async (
        raidSessionId: string,
        manualLoots: NewLootManual[]
    ): Promise<{ imported: number; errors: string[] }> => {
        return lootService.addManual(raidSessionId, manualLoots)
    }
)

// ============== LOOT ASSIGNMENT INFO ==============

export const getLootAssignmentInfo = safeAction(
    async (lootId: string): Promise<LootAssignmentInfo> => {
        return lootService.getAssignmentInfo(lootId)
    }
)

export const getCharactersWithLootsByItemId = safeAction(
    async (itemId: number): Promise<CharacterWithGears[]> => {
        return lootService.getCharactersWithLootsByItemId(itemId)
    }
)

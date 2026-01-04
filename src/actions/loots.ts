"use server"

import { lootService } from "@/services/loot.service"
import type { CharacterWithGears } from "@/shared/models/character.models"
import type {
    CharAssignmentHighlights,
    LootWithAssigned,
    LootWithItem,
    NewLootManual,
} from "@/shared/models/loot.models"
import type { LootAssignmentInfo } from "@/shared/types"

export async function getLootsBySessionIdWithItem(
    raidSessionId: string
): Promise<LootWithItem[]> {
    return lootService.getBySessionIdWithItem(raidSessionId)
}

export async function getLootsBySessionIdsWithAssigned(
    raidSessionIds: string[]
): Promise<LootWithAssigned[]> {
    return lootService.getBySessionIdsWithAssigned(raidSessionIds)
}

export async function assignLoot(
    charId: string,
    lootId: string,
    highlights: CharAssignmentHighlights | null
): Promise<void> {
    return lootService.assign(charId, lootId, highlights)
}

export async function unassignLoot(lootId: string): Promise<void> {
    return lootService.unassign(lootId)
}

export async function deleteLoot(lootId: string): Promise<void> {
    return lootService.delete(lootId)
}

// ============== LOOT IMPORT ACTIONS ==============

export async function importRcLootCsv(
    raidSessionId: string,
    csv: string,
    importAssignedCharacter: boolean
): Promise<{ imported: number; errors: string[] }> {
    return lootService.importRcLoot(raidSessionId, csv, importAssignedCharacter)
}

export async function importRcLootAssignments(
    raidSessionId: string,
    csv: string
): Promise<{ assigned: number; warnings: string[] }> {
    return lootService.importRcLootAssignments(raidSessionId, csv)
}

export async function importMrtLoot(
    raidSessionId: string,
    data: string
): Promise<{ imported: number; errors: string[] }> {
    return lootService.importMrtLoot(raidSessionId, data)
}

export async function addManualLoot(
    raidSessionId: string,
    manualLoots: NewLootManual[]
): Promise<{ imported: number; errors: string[] }> {
    return lootService.addManual(raidSessionId, manualLoots)
}

// ============== LOOT ASSIGNMENT INFO ==============

export async function getLootAssignmentInfo(lootId: string): Promise<LootAssignmentInfo> {
    return lootService.getAssignmentInfo(lootId)
}

export async function getCharactersWithLootsByItemId(
    itemId: number
): Promise<CharacterWithGears[]> {
    return lootService.getCharactersWithLootsByItemId(itemId)
}

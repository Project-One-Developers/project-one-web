import { eq, inArray, type InferInsertModel } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { lootTable } from "@/db/schema"
import { newUUID } from "@/db/utils"
import {
    lootSchema,
    lootWithAssignedSchema,
    lootWithItemSchema,
} from "@/shared/schemas/loot.schema"
import type {
    Character,
    CharAssignmentHighlights,
    Loot,
    LootWithAssigned,
    LootWithItem,
    NewLoot,
} from "@/shared/types/types"

export async function getLootById(lootId: string): Promise<Loot> {
    const result = await db.query.lootTable.findFirst({
        where: (lootTable, { eq }) => eq(lootTable.id, lootId),
    })
    return lootSchema.parse(result)
}

export async function getLootWithItemById(lootId: string): Promise<LootWithItem> {
    const result = await db.query.lootTable.findFirst({
        where: (lootTable, { eq }) => eq(lootTable.id, lootId),
        with: { item: true },
    })
    return lootWithItemSchema.parse(result)
}

export async function getLootAssigned(): Promise<Loot[]> {
    const result = await db.query.lootTable.findMany({
        where: (lootTable, { isNotNull }) => isNotNull(lootTable.raidSessionId),
    })
    return z.array(lootSchema).parse(result)
}

export async function getLootAssignedBySession(raidSessionId: string): Promise<Loot[]> {
    const result = await db.query.lootTable.findMany({
        where: (lootTable, { eq, and, isNotNull }) =>
            and(
                eq(lootTable.raidSessionId, raidSessionId),
                isNotNull(lootTable.assignedCharacterId)
            ),
    })
    return z.array(lootSchema).parse(result)
}

export async function getLootsByRaidSessionId(raidSessionId: string): Promise<Loot[]> {
    const result = await db.query.lootTable.findMany({
        where: (lootTable, { eq }) => eq(lootTable.raidSessionId, raidSessionId),
    })
    return z.array(lootSchema).parse(result)
}

export async function getLootsByRaidSessionIdWithAssigned(
    raidSessionId: string
): Promise<LootWithAssigned[]> {
    const result = await db.query.lootTable.findMany({
        where: (lootTable, { eq }) => eq(lootTable.raidSessionId, raidSessionId),
        with: { assignedCharacter: true },
    })
    return z.array(lootWithAssignedSchema).parse(result)
}

export async function getLootsByRaidSessionIdsWithAssigned(
    raidSessionIds: string[]
): Promise<LootWithAssigned[]> {
    if (raidSessionIds.length === 0) {
        return []
    }

    const result = await db.query.lootTable.findMany({
        where: inArray(lootTable.raidSessionId, raidSessionIds),
        with: { assignedCharacter: true },
    })
    return z.array(lootWithAssignedSchema).parse(result)
}

export async function getLootsByRaidSessionIdWithItem(
    raidSessionId: string
): Promise<LootWithItem[]> {
    const result = await db.query.lootTable.findMany({
        where: (lootTable, { eq }) => eq(lootTable.raidSessionId, raidSessionId),
        with: { item: true },
    })
    return z.array(lootWithItemSchema).parse(result)
}

export async function addLoots(
    raidSessionId: string,
    loots: NewLoot[],
    eligibleCharacters: Character[]
): Promise<void> {
    const lootValues: InferInsertModel<typeof lootTable>[] = loots.map((loot) => ({
        id: loot.addonId ?? newUUID(),
        charsEligibility: eligibleCharacters.map((c) => c.id),
        itemId: loot.gearItem.item.id,
        raidSessionId,
        dropDate: loot.dropDate,
        gearItem: loot.gearItem,
        raidDifficulty: loot.raidDifficulty,
        itemString: loot.itemString,
        tradedToAssigned: false,
        assignedCharacterId: loot.assignedTo,
    }))

    await db
        .insert(lootTable)
        .values(lootValues)
        .onConflictDoNothing({ target: lootTable.id })
}

export async function assignLoot(
    charId: string,
    lootId: string,
    highlights: CharAssignmentHighlights | null
): Promise<void> {
    await db
        .update(lootTable)
        .set({
            assignedCharacterId: charId,
            assignedHighlights: highlights,
        })
        .where(eq(lootTable.id, lootId))
}

export async function unassignLoot(lootId: string): Promise<void> {
    await db
        .update(lootTable)
        .set({ assignedCharacterId: null })
        .where(eq(lootTable.id, lootId))
}

export async function tradeLoot(lootId: string): Promise<void> {
    await db
        .update(lootTable)
        .set({ tradedToAssigned: true })
        .where(eq(lootTable.id, lootId))
}

export async function untradeLoot(lootId: string): Promise<void> {
    await db
        .update(lootTable)
        .set({ tradedToAssigned: false })
        .where(eq(lootTable.id, lootId))
}

export async function deleteLoot(lootId: string): Promise<void> {
    await db.delete(lootTable).where(eq(lootTable.id, lootId))
}

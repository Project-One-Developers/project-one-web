import { eq, inArray, type InferInsertModel } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { lootTable } from "@/db/schema"
import { newUUID } from "@/db/utils"
import type { Character } from "@/shared/models/character.model"
import {
    lootSchema,
    lootWithAssignedSchema,
    lootWithItemSchema,
    type CharAssignmentHighlights,
    type Loot,
    type LootWithAssigned,
    type LootWithItem,
    type NewLoot,
} from "@/shared/models/loot.model"

export const lootRepo = {
    getById: async (lootId: string): Promise<Loot> => {
        const result = await db.query.lootTable.findFirst({
            where: (lootTable, { eq }) => eq(lootTable.id, lootId),
        })
        return lootSchema.parse(result)
    },

    getWithItemById: async (lootId: string): Promise<LootWithItem> => {
        const result = await db.query.lootTable.findFirst({
            where: (lootTable, { eq }) => eq(lootTable.id, lootId),
            with: { item: true },
        })
        return lootWithItemSchema.parse(result)
    },

    getAssigned: async (): Promise<Loot[]> => {
        const result = await db.query.lootTable.findMany({
            where: (lootTable, { isNotNull }) => isNotNull(lootTable.raidSessionId),
        })
        return z.array(lootSchema).parse(result)
    },

    getAssignedByItemId: async (itemId: number): Promise<Loot[]> => {
        const result = await db.query.lootTable.findMany({
            where: (lootTable, { and, eq, isNotNull }) =>
                and(
                    eq(lootTable.itemId, itemId),
                    isNotNull(lootTable.assignedCharacterId)
                ),
        })
        return z.array(lootSchema).parse(result)
    },

    getAssignedBySession: async (raidSessionId: string): Promise<Loot[]> => {
        const result = await db.query.lootTable.findMany({
            where: (lootTable, { eq, and, isNotNull }) =>
                and(
                    eq(lootTable.raidSessionId, raidSessionId),
                    isNotNull(lootTable.assignedCharacterId)
                ),
        })
        return z.array(lootSchema).parse(result)
    },

    getByRaidSessionId: async (raidSessionId: string): Promise<Loot[]> => {
        const result = await db.query.lootTable.findMany({
            where: (lootTable, { eq }) => eq(lootTable.raidSessionId, raidSessionId),
        })
        return z.array(lootSchema).parse(result)
    },

    getByRaidSessionIdWithAssigned: async (
        raidSessionId: string
    ): Promise<LootWithAssigned[]> => {
        const result = await db.query.lootTable.findMany({
            where: (lootTable, { eq }) => eq(lootTable.raidSessionId, raidSessionId),
            with: { assignedCharacter: true },
        })
        return z.array(lootWithAssignedSchema).parse(result)
    },

    getByRaidSessionIdsWithAssigned: async (
        raidSessionIds: string[]
    ): Promise<LootWithAssigned[]> => {
        if (raidSessionIds.length === 0) {
            return []
        }

        const result = await db.query.lootTable.findMany({
            where: inArray(lootTable.raidSessionId, raidSessionIds),
            with: { assignedCharacter: true },
        })
        return z.array(lootWithAssignedSchema).parse(result)
    },

    getByRaidSessionIdWithItem: async (
        raidSessionId: string
    ): Promise<LootWithItem[]> => {
        const result = await db.query.lootTable.findMany({
            where: (lootTable, { eq }) => eq(lootTable.raidSessionId, raidSessionId),
            with: { item: true },
        })
        return z.array(lootWithItemSchema).parse(result)
    },

    addMany: async (
        raidSessionId: string,
        loots: NewLoot[],
        eligibleCharacters: Character[]
    ): Promise<void> => {
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
    },

    assign: async (
        charId: string,
        lootId: string,
        highlights: CharAssignmentHighlights | null
    ): Promise<void> => {
        await db
            .update(lootTable)
            .set({
                assignedCharacterId: charId,
                assignedHighlights: highlights,
            })
            .where(eq(lootTable.id, lootId))
    },

    unassign: async (lootId: string): Promise<void> => {
        await db
            .update(lootTable)
            .set({ assignedCharacterId: null })
            .where(eq(lootTable.id, lootId))
    },

    trade: async (lootId: string): Promise<void> => {
        await db
            .update(lootTable)
            .set({ tradedToAssigned: true })
            .where(eq(lootTable.id, lootId))
    },

    untrade: async (lootId: string): Promise<void> => {
        await db
            .update(lootTable)
            .set({ tradedToAssigned: false })
            .where(eq(lootTable.id, lootId))
    },

    delete: async (lootId: string): Promise<void> => {
        await db.delete(lootTable).where(eq(lootTable.id, lootId))
    },
}

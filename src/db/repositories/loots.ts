import { and, eq, inArray, type InferInsertModel, isNotNull } from "drizzle-orm"
import { db } from "@/db"
import { charTable, itemTable, lootTable } from "@/db/schema"
import { identity, mapAndParse, newUUID } from "@/db/utils"
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

type LootWithItemJoin = {
    loot: typeof lootTable.$inferSelect
    item: typeof itemTable.$inferSelect
}
type LootWithAssignedJoin = {
    loot: typeof lootTable.$inferSelect
    assignedCharacter: typeof charTable.$inferSelect | null
}

function mapJoinToLootWithItem(row: LootWithItemJoin): LootWithItem {
    return { ...row.loot, item: row.item }
}

function mapJoinToLootWithAssigned(row: LootWithAssignedJoin): LootWithAssigned {
    return { ...row.loot, assignedCharacter: row.assignedCharacter }
}

export const lootRepo = {
    getById: async (lootId: string): Promise<Loot> => {
        const result = await db
            .select()
            .from(lootTable)
            .where(eq(lootTable.id, lootId))
            .then((r) => r.at(0))

        if (!result) {
            throw new Error(`Loot not found: ${lootId}`)
        }

        return mapAndParse(result, identity, lootSchema)
    },

    getWithItemById: async (lootId: string): Promise<LootWithItem> => {
        const result = await db
            .select({ loot: lootTable, item: itemTable })
            .from(lootTable)
            .innerJoin(itemTable, eq(lootTable.itemId, itemTable.id))
            .where(eq(lootTable.id, lootId))
            .then((r) => r.at(0))

        if (!result) {
            throw new Error(`Loot not found: ${lootId}`)
        }
        return mapAndParse(result, mapJoinToLootWithItem, lootWithItemSchema)
    },

    getAssigned: async (): Promise<Loot[]> => {
        const result = await db
            .select()
            .from(lootTable)
            .where(isNotNull(lootTable.raidSessionId))
        return mapAndParse(result, identity, lootSchema)
    },

    getAssignedByItemId: async (itemId: number): Promise<Loot[]> => {
        const result = await db
            .select()
            .from(lootTable)
            .where(
                and(
                    eq(lootTable.itemId, itemId),
                    isNotNull(lootTable.assignedCharacterId)
                )
            )
        return mapAndParse(result, identity, lootSchema)
    },

    getAssignedBySession: async (raidSessionId: string): Promise<Loot[]> => {
        const result = await db
            .select()
            .from(lootTable)
            .where(
                and(
                    eq(lootTable.raidSessionId, raidSessionId),
                    isNotNull(lootTable.assignedCharacterId)
                )
            )
        return mapAndParse(result, identity, lootSchema)
    },

    getByRaidSessionId: async (raidSessionId: string): Promise<Loot[]> => {
        const result = await db
            .select()
            .from(lootTable)
            .where(eq(lootTable.raidSessionId, raidSessionId))
        return mapAndParse(result, identity, lootSchema)
    },

    getByRaidSessionIdWithAssigned: async (
        raidSessionId: string
    ): Promise<LootWithAssigned[]> => {
        const result = await db
            .select({ loot: lootTable, assignedCharacter: charTable })
            .from(lootTable)
            .leftJoin(charTable, eq(lootTable.assignedCharacterId, charTable.id))
            .where(eq(lootTable.raidSessionId, raidSessionId))

        return mapAndParse(result, mapJoinToLootWithAssigned, lootWithAssignedSchema)
    },

    getByRaidSessionIdsWithAssigned: async (
        raidSessionIds: string[]
    ): Promise<LootWithAssigned[]> => {
        if (raidSessionIds.length === 0) {
            return []
        }

        const result = await db
            .select({ loot: lootTable, assignedCharacter: charTable })
            .from(lootTable)
            .leftJoin(charTable, eq(lootTable.assignedCharacterId, charTable.id))
            .where(inArray(lootTable.raidSessionId, raidSessionIds))

        return mapAndParse(result, mapJoinToLootWithAssigned, lootWithAssignedSchema)
    },

    getByRaidSessionIdWithItem: async (
        raidSessionId: string
    ): Promise<LootWithItem[]> => {
        const result = await db
            .select({ loot: lootTable, item: itemTable })
            .from(lootTable)
            .innerJoin(itemTable, eq(lootTable.itemId, itemTable.id))
            .where(eq(lootTable.raidSessionId, raidSessionId))

        return mapAndParse(result, mapJoinToLootWithItem, lootWithItemSchema)
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

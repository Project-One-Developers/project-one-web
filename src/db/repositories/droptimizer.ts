import {
    and,
    desc,
    eq,
    inArray,
    type InferInsertModel,
    type InferSelectModel,
    lte,
} from "drizzle-orm"
import "server-only"
import { db } from "@/db"
import { droptimizerTable, droptimizerUpgradesTable, itemTable } from "@/db/schema"
import { mapAndParse, newUUID } from "@/db/utils"
import { logger } from "@/lib/logger"
import { s } from "@/shared/libs/safe-stringify"
import {
    droptimizerSchema,
    type Droptimizer,
    type DroptimizerUpgrade,
    type NewDroptimizer,
} from "@/shared/models/simulation.model"
import type { WowRaidDifficulty } from "@/shared/models/wow.model"

type DbDroptimizer = InferSelectModel<typeof droptimizerTable>
type DbDroptimizerUpgradeBase = InferSelectModel<typeof droptimizerUpgradesTable>
type DbItem = InferSelectModel<typeof itemTable>
type DbDroptimizerUpgradeWithItem = Omit<DbDroptimizerUpgradeBase, "itemId"> & {
    item: DbItem
}
type DbDroptimizerWithUpgrades = DbDroptimizer & {
    upgrades: DbDroptimizerUpgradeWithItem[]
}

function mapDbToUpgrade(dbRow: DbDroptimizerUpgradeWithItem): DroptimizerUpgrade {
    return {
        id: dbRow.id,
        item: dbRow.item,
        dps: dbRow.dps,
        ilvl: dbRow.ilvl,
        slot: dbRow.slot,
        catalyzedItemId: dbRow.catalyzedItemId,
        tiersetItemId: dbRow.tiersetItemId,
        droptimizerId: dbRow.droptimizerId,
    }
}

function mapDbToDroptimizer(dbRow: DbDroptimizerWithUpgrades): Droptimizer {
    return {
        id: dbRow.id,
        url: dbRow.url,
        characterId: dbRow.characterId,
        dateImported: dbRow.dateImported,
        simInfo: {
            date: dbRow.simDate,
            fightstyle: dbRow.simFightStyle,
            duration: dbRow.simDuration,
            nTargets: dbRow.simNTargets,
            upgradeEquipped: dbRow.simUpgradeEquipped ?? false,
        },
        raidInfo: {
            id: dbRow.raidId,
            difficulty: dbRow.raidDifficulty,
        },
        charInfo: {
            class: dbRow.characterClass,
            classId: dbRow.characterClassId,
            spec: dbRow.characterSpec,
            specId: dbRow.characterSpecId,
            talents: dbRow.characterTalents,
        },
        upgrades: dbRow.upgrades.map(mapDbToUpgrade),
        weeklyChest: dbRow.weeklyChest ?? [],
        currencies: dbRow.currencies ?? [],
        itemsAverageItemLevel: dbRow.itemsAverageItemLevel,
        itemsAverageItemLevelEquipped: dbRow.itemsAverageItemLevelEquipped,
        itemsEquipped: dbRow.itemsEquipped,
        itemsInBag: dbRow.itemsInBag ?? [],
        tiersetInfo: dbRow.tiersetInfo ?? [],
    }
}

// Compact version for roster page - only fetches fields needed for item level display
export type DroptimizerCompact = {
    characterId: string
    simDate: number
    itemsAverageItemLevelEquipped: number | null
    tiersetInfo: unknown[] | null // We only need the array length for counting
}

/**
 * Helper to fetch upgrades with items for given droptimizer IDs.
 */
async function fetchUpgradesWithItems(
    droptimizerIds: string[]
): Promise<Map<string, DbDroptimizerUpgradeWithItem[]>> {
    if (droptimizerIds.length === 0) {
        return new Map()
    }

    const upgradesWithItems: DbDroptimizerUpgradeWithItem[] = await db
        .select({
            id: droptimizerUpgradesTable.id,
            dps: droptimizerUpgradesTable.dps,
            slot: droptimizerUpgradesTable.slot,
            ilvl: droptimizerUpgradesTable.ilvl,
            tiersetItemId: droptimizerUpgradesTable.tiersetItemId,
            catalyzedItemId: droptimizerUpgradesTable.catalyzedItemId,
            droptimizerId: droptimizerUpgradesTable.droptimizerId,
            item: itemTable,
        })
        .from(droptimizerUpgradesTable)
        .innerJoin(itemTable, eq(droptimizerUpgradesTable.itemId, itemTable.id))
        .where(inArray(droptimizerUpgradesTable.droptimizerId, droptimizerIds))

    return Map.groupBy(upgradesWithItems, (u) => u.droptimizerId)
}

/**
 * Attaches upgrades to a single droptimizer.
 */
async function withUpgrades(
    droptimizer: DbDroptimizer
): Promise<DbDroptimizerWithUpgrades> {
    const upgradesById = await fetchUpgradesWithItems([droptimizer.id])
    return {
        ...droptimizer,
        upgrades: upgradesById.get(droptimizer.id) ?? [],
    }
}

/**
 * Attaches upgrades to multiple droptimizers.
 */
async function withUpgradesMany(
    droptimizers: DbDroptimizer[]
): Promise<DbDroptimizerWithUpgrades[]> {
    if (droptimizers.length === 0) {
        return []
    }

    const ids = droptimizers.map((d) => d.id)
    const upgradesById = await fetchUpgradesWithItems(ids)

    return droptimizers.map((d) => ({
        ...d,
        upgrades: upgradesById.get(d.id) ?? [],
    }))
}

// Columns for DISTINCT ON to get latest droptimizer per character+raid+difficulty+spec
const distinctOnColumns = [
    droptimizerTable.characterId,
    droptimizerTable.raidId,
    droptimizerTable.raidDifficulty,
    droptimizerTable.characterSpecId,
]

export const droptimizerRepo = {
    getById: async (id: string): Promise<Droptimizer | null> => {
        const droptimizer = await db
            .select()
            .from(droptimizerTable)
            .where(eq(droptimizerTable.id, id))
            .then((r) => r.at(0))

        if (!droptimizer) {
            return null
        }

        const result = await withUpgrades(droptimizer)
        return mapAndParse(result, mapDbToDroptimizer, droptimizerSchema)
    },

    getByUrl: async (url: string): Promise<Droptimizer | null> => {
        const droptimizer = await db
            .select()
            .from(droptimizerTable)
            .where(eq(droptimizerTable.url, url))
            .then((r) => r.at(0))

        if (!droptimizer) {
            return null
        }

        const result = await withUpgrades(droptimizer)
        return mapAndParse(result, mapDbToDroptimizer, droptimizerSchema)
    },

    getList: async (): Promise<Droptimizer[]> => {
        const droptimizers = await db.select().from(droptimizerTable)
        const result = await withUpgradesMany(droptimizers)
        return mapAndParse(result, mapDbToDroptimizer, droptimizerSchema)
    },

    getByIds: async (ids: string[]): Promise<Droptimizer[]> => {
        if (ids.length === 0) {
            return []
        }
        const droptimizers = await db
            .select()
            .from(droptimizerTable)
            .where(inArray(droptimizerTable.id, ids))
        const result = await withUpgradesMany(droptimizers)
        return mapAndParse(result, mapDbToDroptimizer, droptimizerSchema)
    },

    getLatestList: async (): Promise<Droptimizer[]> => {
        // Use DISTINCT ON to get latest per character+raid+difficulty+spec
        const latestDroptimizers = await db
            .selectDistinctOn(distinctOnColumns, {
                id: droptimizerTable.id,
            })
            .from(droptimizerTable)
            .orderBy(...distinctOnColumns, desc(droptimizerTable.simDate))

        const ids = latestDroptimizers.map((row) => row.id)
        return droptimizerRepo.getByIds(ids)
    },

    getByCharacterIdAndDiff: async (
        characterId: string,
        raidDiff: WowRaidDifficulty
    ): Promise<Droptimizer | null> => {
        const droptimizer = await db
            .select()
            .from(droptimizerTable)
            .where(
                and(
                    eq(droptimizerTable.characterId, characterId),
                    eq(droptimizerTable.raidDifficulty, raidDiff)
                )
            )
            .orderBy(desc(droptimizerTable.simDate))
            .limit(1)
            .then((r) => r.at(0))

        if (!droptimizer) {
            return null
        }

        const result = await withUpgrades(droptimizer)
        return mapAndParse(result, mapDbToDroptimizer, droptimizerSchema)
    },

    add: async (
        droptimizer: NewDroptimizer,
        characterId: string
    ): Promise<Droptimizer> => {
        // Check for existing droptimizer with same character+raid+difficulty+spec
        const alreadyPresent = await db
            .select()
            .from(droptimizerTable)
            .where(
                and(
                    eq(droptimizerTable.characterId, characterId),
                    eq(droptimizerTable.raidId, droptimizer.raidInfo.id),
                    eq(droptimizerTable.raidDifficulty, droptimizer.raidInfo.difficulty),
                    eq(droptimizerTable.characterSpecId, droptimizer.charInfo.specId)
                )
            )
            .then((r) => r.at(0))

        if (alreadyPresent) {
            if (alreadyPresent.simDate >= droptimizer.simInfo.date) {
                logger.debug(
                    "Droptimizer",
                    `addDroptimizer: not importing - not newer than existing - characterId: ${characterId}, raidId: ${s(droptimizer.raidInfo.id)}`
                )
                const existing = await droptimizerRepo.getById(alreadyPresent.id)
                if (!existing) {
                    throw new Error("Failed to get existing droptimizer")
                }
                return existing
            }
            // Delete older version
            await db
                .delete(droptimizerTable)
                .where(eq(droptimizerTable.id, alreadyPresent.id))
        }

        const id = newUUID()

        // Insert new droptimizer
        const droptimizerRes = await db
            .insert(droptimizerTable)
            .values({
                id,
                url: droptimizer.url,
                characterId,
                dateImported: droptimizer.dateImported,
                simDate: droptimizer.simInfo.date,
                simFightStyle: droptimizer.simInfo.fightstyle,
                simDuration: droptimizer.simInfo.duration,
                simNTargets: droptimizer.simInfo.nTargets,
                simUpgradeEquipped: droptimizer.simInfo.upgradeEquipped,
                raidId: droptimizer.raidInfo.id,
                raidDifficulty: droptimizer.raidInfo.difficulty,
                characterClass: droptimizer.charInfo.class,
                characterClassId: droptimizer.charInfo.classId,
                characterSpec: droptimizer.charInfo.spec,
                characterSpecId: droptimizer.charInfo.specId,
                characterTalents: droptimizer.charInfo.talents,
                weeklyChest: droptimizer.weeklyChest,
                currencies: droptimizer.currencies,
                itemsEquipped: droptimizer.itemsEquipped,
                itemsInBag: droptimizer.itemsInBag,
                tiersetInfo: droptimizer.tiersetInfo,
            })
            .returning({ id: droptimizerTable.id })
            .then((r) => r.at(0))

        if (!droptimizerRes) {
            throw new Error(
                `Failed to insert droptimizer: ${JSON.stringify(droptimizer)}`
            )
        }

        // Insert upgrades
        const upgradesArray = droptimizer.upgrades.map(
            (up): InferInsertModel<typeof droptimizerUpgradesTable> => ({
                id: newUUID(),
                droptimizerId: droptimizerRes.id,
                ...up,
            })
        )

        if (upgradesArray.length > 0) {
            await db.insert(droptimizerUpgradesTable).values(upgradesArray)
        }

        const result = await droptimizerRepo.getById(droptimizerRes.id)
        if (!result) {
            throw new Error("Failed to get newly inserted droptimizer")
        }
        return result
    },

    delete: async (id: string): Promise<void> => {
        await db.delete(droptimizerTable).where(eq(droptimizerTable.id, id))
    },

    deleteOlderThanDate: async (dateUnixTs: number): Promise<void> => {
        await db.delete(droptimizerTable).where(lte(droptimizerTable.simDate, dateUnixTs))
    },

    getLatestUnixTs: async (): Promise<number | null> => {
        const result = await db
            .select({ simDate: droptimizerTable.simDate })
            .from(droptimizerTable)
            .orderBy(desc(droptimizerTable.simDate))
            .limit(1)
            .then((r) => r.at(0))
        return result ? result.simDate : null
    },

    getByCharacterId: async (characterId: string): Promise<Droptimizer | null> => {
        const droptimizer = await db
            .select()
            .from(droptimizerTable)
            .where(eq(droptimizerTable.characterId, characterId))
            .orderBy(desc(droptimizerTable.simDate))
            .limit(1)
            .then((r) => r.at(0))

        if (!droptimizer) {
            return null
        }

        const result = await withUpgrades(droptimizer)
        return mapAndParse(result, mapDbToDroptimizer, droptimizerSchema)
    },

    getLatestByCharacterIds: async (characterIds: string[]): Promise<Droptimizer[]> => {
        if (characterIds.length === 0) {
            return []
        }

        // Use DISTINCT ON to get latest per character+raid+difficulty+spec
        const latestDroptimizers = await db
            .selectDistinctOn(distinctOnColumns, {
                id: droptimizerTable.id,
            })
            .from(droptimizerTable)
            .where(inArray(droptimizerTable.characterId, characterIds))
            .orderBy(...distinctOnColumns, desc(droptimizerTable.simDate))

        const ids = latestDroptimizers.map((row) => row.id)
        return droptimizerRepo.getByIds(ids)
    },

    getLatestByCharacterIdsCompact: async (
        characterIds: string[]
    ): Promise<DroptimizerCompact[]> => {
        if (characterIds.length === 0) {
            return []
        }

        // Use DISTINCT ON to get latest per character+raid+difficulty+spec
        // Only select fields needed for roster display
        const result = await db
            .selectDistinctOn(distinctOnColumns, {
                characterId: droptimizerTable.characterId,
                simDate: droptimizerTable.simDate,
                itemsAverageItemLevelEquipped:
                    droptimizerTable.itemsAverageItemLevelEquipped,
                tiersetInfo: droptimizerTable.tiersetInfo,
            })
            .from(droptimizerTable)
            .where(inArray(droptimizerTable.characterId, characterIds))
            .orderBy(...distinctOnColumns, desc(droptimizerTable.simDate))

        return result
    },
}

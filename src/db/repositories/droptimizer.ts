import {
    and,
    desc,
    eq,
    inArray,
    type InferInsertModel,
    type InferSelectModel,
    lte,
    or,
} from "drizzle-orm"
import { db } from "@/db"
import { droptimizerTable, droptimizerUpgradesTable, itemTable } from "@/db/schema"
import { mapAndParse, newUUID } from "@/db/utils"
import { logger } from "@/lib/logger"
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

function mapDbToUpgrade(db: DbDroptimizerUpgradeWithItem): DroptimizerUpgrade {
    return {
        id: db.id,
        item: db.item,
        dps: db.dps,
        ilvl: db.ilvl,
        slot: db.slot,
        catalyzedItemId: db.catalyzedItemId,
        tiersetItemId: db.tiersetItemId,
        droptimizerId: db.droptimizerId,
    }
}

function mapDbToDroptimizer(db: DbDroptimizerWithUpgrades): Droptimizer {
    return {
        url: db.url,
        ak: db.ak,
        dateImported: db.dateImported,
        simInfo: {
            date: db.simDate,
            fightstyle: db.simFightStyle,
            duration: db.simDuration,
            nTargets: db.simNTargets,
            upgradeEquipped: db.simUpgradeEquipped ?? false,
        },
        raidInfo: {
            id: db.raidId,
            difficulty: db.raidDifficulty,
        },
        charInfo: {
            name: db.characterName,
            server: db.characterServer,
            class: db.characterClass,
            classId: db.characterClassId,
            spec: db.characterSpec,
            specId: db.characterSpecId,
            talents: db.characterTalents,
        },
        upgrades: db.upgrades.map(mapDbToUpgrade),
        weeklyChest: db.weeklyChest ?? [],
        currencies: db.currencies ?? [],
        itemsAverageItemLevel: db.itemsAverageItemLevel,
        itemsAverageItemLevelEquipped: db.itemsAverageItemLevelEquipped,
        itemsEquipped: db.itemsEquipped,
        itemsInBag: db.itemsInBag ?? [],
        tiersetInfo: db.tiersetInfo ?? [],
    }
}

// Compact version for roster page - only fetches fields needed for item level display
export type DroptimizerCompact = {
    characterName: string
    characterServer: string
    simDate: number
    itemsAverageItemLevelEquipped: number | null
    tiersetInfo: unknown[] | null // We only need the array length for counting
}

/**
 * Helper to fetch upgrades with items for given droptimizer URLs.
 */
async function fetchUpgradesWithItems(
    urls: string[]
): Promise<Map<string, DbDroptimizerUpgradeWithItem[]>> {
    if (urls.length === 0) {
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
        .where(inArray(droptimizerUpgradesTable.droptimizerId, urls))

    return Map.groupBy(upgradesWithItems, (u) => u.droptimizerId)
}

/**
 * Attaches upgrades to a single droptimizer.
 */
async function withUpgrades(
    droptimizer: DbDroptimizer
): Promise<DbDroptimizerWithUpgrades> {
    const upgradesByUrl = await fetchUpgradesWithItems([droptimizer.url])
    return {
        ...droptimizer,
        upgrades: upgradesByUrl.get(droptimizer.url) ?? [],
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

    const urls = droptimizers.map((d) => d.url)
    const upgradesByUrl = await fetchUpgradesWithItems(urls)

    return droptimizers.map((d) => ({
        ...d,
        upgrades: upgradesByUrl.get(d.url) ?? [],
    }))
}

export const droptimizerRepo = {
    get: async (url: string): Promise<Droptimizer | null> => {
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

    getByIdsList: async (ids: string[]): Promise<Droptimizer[]> => {
        if (ids.length === 0) {
            return []
        }
        const droptimizers = await db
            .select()
            .from(droptimizerTable)
            .where(inArray(droptimizerTable.url, ids))
        const result = await withUpgradesMany(droptimizers)
        return mapAndParse(result, mapDbToDroptimizer, droptimizerSchema)
    },

    getLatestList: async (): Promise<Droptimizer[]> => {
        // Use Drizzle's selectDistinctOn for PostgreSQL DISTINCT ON
        const latestDroptimizers = await db
            .selectDistinctOn([droptimizerTable.ak], {
                url: droptimizerTable.url,
            })
            .from(droptimizerTable)
            .orderBy(droptimizerTable.ak, desc(droptimizerTable.simDate))

        const urls = latestDroptimizers.map((row) => row.url)
        return droptimizerRepo.getByIdsList(urls)
    },

    getLastByCharAndDiff: async (
        charName: string,
        charRealm: string,
        raidDiff: WowRaidDifficulty
    ): Promise<Droptimizer | null> => {
        const droptimizer = await db
            .select()
            .from(droptimizerTable)
            .where(
                and(
                    eq(droptimizerTable.characterName, charName),
                    eq(droptimizerTable.characterServer, charRealm),
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

    add: async (droptimizer: NewDroptimizer): Promise<Droptimizer> => {
        // Check for existing droptimizer with same ak
        const alreadyPresent = await db
            .select()
            .from(droptimizerTable)
            .where(eq(droptimizerTable.ak, droptimizer.ak))
            .then((r) => r.at(0))

        if (alreadyPresent) {
            if (alreadyPresent.simDate >= droptimizer.simInfo.date) {
                logger.debug(
                    "Droptimizer",
                    `addDroptimizer: not importing - not newer than existing - ak: ${droptimizer.ak}`
                )
                const existing = await droptimizerRepo.get(alreadyPresent.url)
                if (!existing) {
                    throw new Error("Failed to get existing droptimizer")
                }
                return existing
            }
            // Delete older version
            await db
                .delete(droptimizerTable)
                .where(eq(droptimizerTable.url, alreadyPresent.url))
        }

        // Insert new droptimizer
        const droptimizerRes = await db
            .insert(droptimizerTable)
            .values({
                url: droptimizer.url,
                ak: droptimizer.ak,
                dateImported: droptimizer.dateImported,
                simDate: droptimizer.simInfo.date,
                simFightStyle: droptimizer.simInfo.fightstyle,
                simDuration: droptimizer.simInfo.duration,
                simNTargets: droptimizer.simInfo.nTargets,
                simUpgradeEquipped: droptimizer.simInfo.upgradeEquipped,
                raidId: droptimizer.raidInfo.id,
                raidDifficulty: droptimizer.raidInfo.difficulty,
                characterName: droptimizer.charInfo.name,
                characterServer: droptimizer.charInfo.server,
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
            .returning({ url: droptimizerTable.url })
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
                droptimizerId: droptimizerRes.url,
                ...up,
            })
        )

        if (upgradesArray.length > 0) {
            await db.insert(droptimizerUpgradesTable).values(upgradesArray)
        }

        const result = await droptimizerRepo.get(droptimizerRes.url)
        if (!result) {
            throw new Error("Failed to get newly inserted droptimizer")
        }
        return result
    },

    delete: async (url: string): Promise<void> => {
        await db.delete(droptimizerTable).where(eq(droptimizerTable.url, url))
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

    getLastByChar: async (
        charName: string,
        charRealm: string
    ): Promise<Droptimizer | null> => {
        const droptimizer = await db
            .select()
            .from(droptimizerTable)
            .where(
                and(
                    eq(droptimizerTable.characterName, charName),
                    eq(droptimizerTable.characterServer, charRealm)
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

    getLatestByChars: async (
        chars: { name: string; realm: string }[]
    ): Promise<Droptimizer[]> => {
        if (chars.length === 0) {
            return []
        }

        // Build OR conditions for each character using Drizzle
        const charCondition = or(
            ...chars.map((c) =>
                and(
                    eq(droptimizerTable.characterName, c.name),
                    eq(droptimizerTable.characterServer, c.realm)
                )
            )
        )

        // Use Drizzle's selectDistinctOn for PostgreSQL DISTINCT ON
        const latestDroptimizers = await db
            .selectDistinctOn([droptimizerTable.ak], {
                url: droptimizerTable.url,
            })
            .from(droptimizerTable)
            .where(charCondition)
            .orderBy(droptimizerTable.ak, desc(droptimizerTable.simDate))

        const urls = latestDroptimizers.map((row) => row.url)
        return droptimizerRepo.getByIdsList(urls)
    },

    getLatestByCharsCompact: async (
        chars: { name: string; realm: string }[]
    ): Promise<DroptimizerCompact[]> => {
        if (chars.length === 0) {
            return []
        }

        // Build OR conditions for each character using Drizzle
        const charCondition = or(
            ...chars.map((c) =>
                and(
                    eq(droptimizerTable.characterName, c.name),
                    eq(droptimizerTable.characterServer, c.realm)
                )
            )
        )

        // Use Drizzle's selectDistinctOn for PostgreSQL DISTINCT ON
        // Only select fields needed for roster display
        const result = await db
            .selectDistinctOn([droptimizerTable.ak], {
                characterName: droptimizerTable.characterName,
                characterServer: droptimizerTable.characterServer,
                simDate: droptimizerTable.simDate,
                itemsAverageItemLevelEquipped:
                    droptimizerTable.itemsAverageItemLevelEquipped,
                tiersetInfo: droptimizerTable.tiersetInfo,
            })
            .from(droptimizerTable)
            .where(charCondition)
            .orderBy(droptimizerTable.ak, desc(droptimizerTable.simDate))

        return result
    },
}

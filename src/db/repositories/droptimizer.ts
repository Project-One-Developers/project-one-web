import {
    and,
    desc,
    eq,
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

export const droptimizerRepo = {
    get: async (url: string): Promise<Droptimizer | null> => {
        const result = await db.query.droptimizerTable.findFirst({
            where: (droptimizerTable, { eq }) => eq(droptimizerTable.url, url),
            with: {
                upgrades: {
                    columns: { itemId: false },
                    with: { item: true },
                },
            },
        })

        if (!result) {
            return null
        }
        return mapAndParse(result, mapDbToDroptimizer, droptimizerSchema)
    },

    getList: async (): Promise<Droptimizer[]> => {
        const result = await db.query.droptimizerTable.findMany({
            with: {
                upgrades: {
                    columns: { itemId: false },
                    with: { item: true },
                },
            },
        })
        return mapAndParse(result, mapDbToDroptimizer, droptimizerSchema)
    },

    getByIdsList: async (ids: string[]): Promise<Droptimizer[]> => {
        const result = await db.query.droptimizerTable.findMany({
            where: (droptimizerTable, { inArray }) => inArray(droptimizerTable.url, ids),
            with: {
                upgrades: {
                    columns: { itemId: false },
                    with: { item: true },
                },
            },
        })
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
        const result = await db.query.droptimizerTable.findFirst({
            where: (droptimizerTable, { eq, and }) =>
                and(
                    eq(droptimizerTable.characterName, charName),
                    eq(droptimizerTable.characterServer, charRealm),
                    eq(droptimizerTable.raidDifficulty, raidDiff)
                ),
            orderBy: (droptimizerTable, { desc }) => desc(droptimizerTable.simDate),
            with: {
                upgrades: {
                    columns: { itemId: false },
                    with: { item: true },
                },
            },
        })
        return result ? mapAndParse(result, mapDbToDroptimizer, droptimizerSchema) : null
    },

    add: async (droptimizer: NewDroptimizer): Promise<Droptimizer> => {
        // Check for existing droptimizer with same ak
        const alreadyPresent = await db.query.droptimizerTable.findFirst({
            where: (droptimizerTable, { eq }) => eq(droptimizerTable.ak, droptimizer.ak),
        })

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
        const result = await db.query.droptimizerTable.findFirst({
            orderBy: (droptimizerTable, { desc }) => desc(droptimizerTable.simDate),
        })
        return result ? result.simDate : null
    },

    getLastByChar: async (
        charName: string,
        charRealm: string
    ): Promise<Droptimizer | null> => {
        const result = await db.query.droptimizerTable.findFirst({
            where: (droptimizerTable, { eq, and }) =>
                and(
                    eq(droptimizerTable.characterName, charName),
                    eq(droptimizerTable.characterServer, charRealm)
                ),
            orderBy: (droptimizerTable, { desc }) => desc(droptimizerTable.simDate),
            with: {
                upgrades: {
                    columns: { itemId: false },
                    with: { item: true },
                },
            },
        })
        return result ? mapAndParse(result, mapDbToDroptimizer, droptimizerSchema) : null
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

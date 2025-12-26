import { db } from "@/db"
import { droptimizerTable, droptimizerUpgradesTable } from "@/db/schema"
import { newUUID } from "@/db/utils"
import { logger } from "@/lib/logger"
import { gearItemSchema } from "@/shared/schemas/items.schema"
import {
    droptimizerCurrencySchema,
    droptimizerUpgradeSchema,
} from "@/shared/schemas/simulations.schemas"
import { wowClassNameSchema, wowRaidDiffSchema } from "@/shared/schemas/wow.schemas"
import type { Droptimizer, NewDroptimizer, WowRaidDifficulty } from "@/shared/types/types"
import { eq, InferInsertModel, lte, sql } from "drizzle-orm"
import { z } from "zod"

// Schema for parsing droptimizer storage results
const droptimizerStorageSchema = z.object({
    url: z.url(),
    ak: z.string(),
    dateImported: z.number(),
    simDate: z.number(),
    simFightStyle: z.string(),
    simDuration: z.number().min(1),
    simNTargets: z.number().min(1),
    simUpgradeEquipped: z.boolean().nullable(),
    raidId: z.number(),
    raidDifficulty: wowRaidDiffSchema,
    characterName: z.string(),
    characterServer: z.string(),
    characterClass: wowClassNameSchema,
    characterClassId: z.number(),
    characterSpec: z.string(),
    characterSpecId: z.number(),
    characterTalents: z.string(),
    upgrades: z.array(droptimizerUpgradeSchema),
    weeklyChest: z.array(gearItemSchema).nullable(),
    currencies: z.array(droptimizerCurrencySchema).nullable(),
    itemsAverageItemLevel: z.number().nullable(),
    itemsAverageItemLevelEquipped: z.number().nullable(),
    itemsInBag: z.array(gearItemSchema).nullable(),
    itemsEquipped: z.array(gearItemSchema),
    tiersetInfo: z.array(gearItemSchema).nullable(),
})

const droptimizerStorageToSchema = droptimizerStorageSchema.transform(
    (data): Droptimizer => ({
        url: data.url,
        ak: data.ak,
        dateImported: data.dateImported,
        simInfo: {
            date: data.simDate,
            fightstyle: data.simFightStyle,
            duration: data.simDuration,
            nTargets: data.simNTargets,
            upgradeEquipped: data.simUpgradeEquipped ?? false,
        },
        raidInfo: {
            id: data.raidId,
            difficulty: data.raidDifficulty,
        },
        charInfo: {
            name: data.characterName,
            server: data.characterServer,
            class: data.characterClass,
            classId: data.characterClassId,
            spec: data.characterSpec,
            specId: data.characterSpecId,
            talents: data.characterTalents,
        },
        upgrades: data.upgrades.map((up) => ({
            id: up.id,
            item: up.item,
            dps: up.dps,
            ilvl: up.ilvl,
            slot: up.slot,
            catalyzedItemId: up.catalyzedItemId,
            tiersetItemId: up.tiersetItemId,
            droptimizerId: up.droptimizerId,
        })),
        weeklyChest: data.weeklyChest ?? [],
        currencies: data.currencies ?? [],
        itemsAverageItemLevel: data.itemsAverageItemLevel,
        itemsAverageItemLevelEquipped: data.itemsAverageItemLevelEquipped,
        itemsEquipped: data.itemsEquipped,
        itemsInBag: data.itemsInBag ?? [],
        tiersetInfo: data.tiersetInfo ?? [],
    })
)

const droptimizerStorageListToSchema = z.array(droptimizerStorageToSchema)

export async function getDroptimizer(url: string): Promise<Droptimizer | null> {
    const result = await db.query.droptimizerTable.findFirst({
        where: (droptimizerTable, { eq }) => eq(droptimizerTable.url, url),
        with: {
            upgrades: true,
        },
    })

    if (!result) {
        return null
    }
    return droptimizerStorageToSchema.parse(result)
}

export async function getDroptimizerList(): Promise<Droptimizer[]> {
    const result = await db.query.droptimizerTable.findMany({
        with: {
            upgrades: {
                columns: { itemId: false },
                with: { item: true },
            },
        },
    })
    return droptimizerStorageListToSchema.parse(result)
}

export async function getDroptimizerByIdsList(ids: string[]): Promise<Droptimizer[]> {
    const result = await db.query.droptimizerTable.findMany({
        where: (droptimizerTable, { inArray }) => inArray(droptimizerTable.url, ids),
        with: {
            upgrades: {
                columns: { itemId: false },
                with: { item: true },
            },
        },
    })
    return droptimizerStorageListToSchema.parse(result)
}

export async function getDroptimizerLatestList(): Promise<Droptimizer[]> {
    const latestDroptimizers = await db.execute(
        sql`
            SELECT DISTINCT ON (${droptimizerTable.ak}) url
            FROM ${droptimizerTable}
            ORDER BY ${droptimizerTable.ak}, ${droptimizerTable.simDate} DESC
        `
    )

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Raw SQL returns known structure
    const urls = (latestDroptimizers.rows as { url: string }[]).map((row) => row.url)
    return getDroptimizerByIdsList(urls)
}

export async function getDroptimizerLastByCharAndDiff(
    charName: string,
    charRealm: string,
    raidDiff: WowRaidDifficulty
): Promise<Droptimizer | null> {
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
    return result ? droptimizerStorageToSchema.parse(result) : null
}

export async function addDroptimizer(droptimizer: NewDroptimizer): Promise<Droptimizer> {
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
            const existing = await getDroptimizer(alreadyPresent.url)
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
        throw new Error(`Failed to insert droptimizer: ${JSON.stringify(droptimizer)}`)
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

    const result = await getDroptimizer(droptimizerRes.url)
    if (!result) {
        throw new Error("Failed to get newly inserted droptimizer")
    }
    return result
}

export async function deleteDroptimizer(url: string): Promise<void> {
    await db.delete(droptimizerTable).where(eq(droptimizerTable.url, url))
}

export async function deleteDroptimizerOlderThanDate(dateUnixTs: number): Promise<void> {
    await db.delete(droptimizerTable).where(lte(droptimizerTable.simDate, dateUnixTs))
}

export async function getLatestDroptimizerUnixTs(): Promise<number | null> {
    const result = await db.query.droptimizerTable.findFirst({
        orderBy: (droptimizerTable, { desc }) => desc(droptimizerTable.simDate),
    })
    return result ? result.simDate : null
}

export async function getDroptimizerLastByChar(
    charName: string,
    charRealm: string
): Promise<Droptimizer | null> {
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
    return result ? droptimizerStorageToSchema.parse(result) : null
}

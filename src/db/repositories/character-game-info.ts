import { and, desc, eq, or } from "drizzle-orm"
import { db } from "@/db"
import { charBlizzardTable, droptimizerTable } from "@/db/schema"
import { mapAndParse } from "@/db/utils"
import {
    characterGameInfoCompactSchema,
    type CharacterGameInfoCompact,
} from "@/shared/models/character.model"

export type CharLookup = { name: string; realm: string }

export const characterGameInfoRepo = {
    getByCharsCompact: async (
        chars: CharLookup[]
    ): Promise<CharacterGameInfoCompact[]> => {
        if (chars.length === 0) {
            return []
        }

        const charCondition = or(
            ...chars.map((c) =>
                and(
                    eq(droptimizerTable.characterName, c.name),
                    eq(droptimizerTable.characterServer, c.realm)
                )
            )
        )

        // CTE for latest droptimizer per character
        const latestDroptimizerSq = db.$with("latest_droptimizer").as(
            db
                .selectDistinctOn(
                    [droptimizerTable.characterName, droptimizerTable.characterServer],
                    {
                        characterName: droptimizerTable.characterName,
                        characterServer: droptimizerTable.characterServer,
                        simDate: droptimizerTable.simDate,
                        ilvl: droptimizerTable.itemsAverageItemLevelEquipped,
                        tiersetInfo: droptimizerTable.tiersetInfo,
                    }
                )
                .from(droptimizerTable)
                .where(charCondition)
                .orderBy(
                    droptimizerTable.characterName,
                    droptimizerTable.characterServer,
                    desc(droptimizerTable.simDate)
                )
        )

        const results = await db
            .with(latestDroptimizerSq)
            .select({
                charName: latestDroptimizerSq.characterName,
                charRealm: latestDroptimizerSq.characterServer,
                droptimizerSimDate: latestDroptimizerSq.simDate,
                droptimizerIlvl: latestDroptimizerSq.ilvl,
                droptimizerTiersetInfo: latestDroptimizerSq.tiersetInfo,
                blizzardEquippedIlvl: charBlizzardTable.equippedItemLevel,
                blizzardItemsEquipped: charBlizzardTable.itemsEquipped,
            })
            .from(latestDroptimizerSq)
            .leftJoin(
                charBlizzardTable,
                and(
                    eq(charBlizzardTable.name, latestDroptimizerSq.characterName),
                    eq(charBlizzardTable.realm, latestDroptimizerSq.characterServer)
                )
            )

        return mapAndParse(
            results,
            (row) => ({
                charName: row.charName,
                charRealm: row.charRealm,
                droptimizer: row.droptimizerSimDate
                    ? {
                          simDate: row.droptimizerSimDate,
                          itemsAverageItemLevelEquipped: row.droptimizerIlvl,
                          tiersetInfo: row.droptimizerTiersetInfo,
                          weeklyChest: null,
                          currencies: null,
                      }
                    : null,
                blizzard: row.blizzardEquippedIlvl
                    ? {
                          equippedItemLevel: row.blizzardEquippedIlvl,
                          itemsEquipped: row.blizzardItemsEquipped,
                      }
                    : null,
            }),
            characterGameInfoCompactSchema
        )
    },

    getByCharsFull: async (chars: CharLookup[]): Promise<CharacterGameInfoCompact[]> => {
        if (chars.length === 0) {
            return []
        }

        const charCondition = or(
            ...chars.map((c) =>
                and(
                    eq(droptimizerTable.characterName, c.name),
                    eq(droptimizerTable.characterServer, c.realm)
                )
            )
        )

        const latestDroptimizerSq = db.$with("latest_droptimizer").as(
            db
                .selectDistinctOn(
                    [droptimizerTable.characterName, droptimizerTable.characterServer],
                    {
                        characterName: droptimizerTable.characterName,
                        characterServer: droptimizerTable.characterServer,
                        simDate: droptimizerTable.simDate,
                        ilvl: droptimizerTable.itemsAverageItemLevelEquipped,
                        tiersetInfo: droptimizerTable.tiersetInfo,
                        weeklyChest: droptimizerTable.weeklyChest,
                        currencies: droptimizerTable.currencies,
                    }
                )
                .from(droptimizerTable)
                .where(charCondition)
                .orderBy(
                    droptimizerTable.characterName,
                    droptimizerTable.characterServer,
                    desc(droptimizerTable.simDate)
                )
        )

        const results = await db
            .with(latestDroptimizerSq)
            .select({
                charName: latestDroptimizerSq.characterName,
                charRealm: latestDroptimizerSq.characterServer,
                droptimizerSimDate: latestDroptimizerSq.simDate,
                droptimizerIlvl: latestDroptimizerSq.ilvl,
                droptimizerTiersetInfo: latestDroptimizerSq.tiersetInfo,
                droptimizerWeeklyChest: latestDroptimizerSq.weeklyChest,
                droptimizerCurrencies: latestDroptimizerSq.currencies,
                blizzardEquippedIlvl: charBlizzardTable.equippedItemLevel,
                blizzardItemsEquipped: charBlizzardTable.itemsEquipped,
            })
            .from(latestDroptimizerSq)
            .leftJoin(
                charBlizzardTable,
                and(
                    eq(charBlizzardTable.name, latestDroptimizerSq.characterName),
                    eq(charBlizzardTable.realm, latestDroptimizerSq.characterServer)
                )
            )

        return mapAndParse(
            results,
            (row) => ({
                charName: row.charName,
                charRealm: row.charRealm,
                droptimizer: row.droptimizerSimDate
                    ? {
                          simDate: row.droptimizerSimDate,
                          itemsAverageItemLevelEquipped: row.droptimizerIlvl,
                          tiersetInfo: row.droptimizerTiersetInfo,
                          weeklyChest: row.droptimizerWeeklyChest,
                          currencies: row.droptimizerCurrencies,
                      }
                    : null,
                blizzard: row.blizzardEquippedIlvl
                    ? {
                          equippedItemLevel: row.blizzardEquippedIlvl,
                          itemsEquipped: row.blizzardItemsEquipped,
                      }
                    : null,
            }),
            characterGameInfoCompactSchema
        )
    },
}

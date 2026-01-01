import { desc, eq, inArray } from "drizzle-orm"
import "server-only"
import { db } from "@/db"
import { charBlizzardTable, charTable, droptimizerTable } from "@/db/schema"
import { mapAndParse } from "@/db/utils"
import {
    characterGameInfoCompactSchema,
    type CharacterGameInfoCompact,
} from "@/shared/models/character.models"

export const characterGameInfoRepo = {
    getByCharsCompact: async (charIds: string[]): Promise<CharacterGameInfoCompact[]> => {
        if (charIds.length === 0) {
            return []
        }

        // CTE for latest droptimizer per character
        const latestDroptimizerSq = db.$with("latest_droptimizer").as(
            db
                .selectDistinctOn([droptimizerTable.characterId], {
                    characterId: droptimizerTable.characterId,
                    simDate: droptimizerTable.simDate,
                    ilvl: droptimizerTable.itemsAverageItemLevelEquipped,
                    tiersetInfo: droptimizerTable.tiersetInfo,
                })
                .from(droptimizerTable)
                .orderBy(droptimizerTable.characterId, desc(droptimizerTable.simDate))
        )

        const results = await db
            .with(latestDroptimizerSq)
            .select({
                charId: charTable.id,
                droptimizerSimDate: latestDroptimizerSq.simDate,
                droptimizerIlvl: latestDroptimizerSq.ilvl,
                droptimizerTiersetInfo: latestDroptimizerSq.tiersetInfo,
                blizzardEquippedIlvl: charBlizzardTable.equippedItemLevel,
                blizzardItemsEquipped: charBlizzardTable.itemsEquipped,
            })
            .from(charTable)
            .where(inArray(charTable.id, charIds))
            .leftJoin(
                latestDroptimizerSq,
                eq(charTable.id, latestDroptimizerSq.characterId)
            )
            .leftJoin(charBlizzardTable, eq(charBlizzardTable.characterId, charTable.id))

        return mapAndParse(
            results,
            (row) => ({
                charId: row.charId,
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

    getByCharsFull: async (charIds: string[]): Promise<CharacterGameInfoCompact[]> => {
        if (charIds.length === 0) {
            return []
        }

        // CTE for latest droptimizer per character
        const latestDroptimizerSq = db.$with("latest_droptimizer").as(
            db
                .selectDistinctOn([droptimizerTable.characterId], {
                    characterId: droptimizerTable.characterId,
                    simDate: droptimizerTable.simDate,
                    ilvl: droptimizerTable.itemsAverageItemLevelEquipped,
                    tiersetInfo: droptimizerTable.tiersetInfo,
                    weeklyChest: droptimizerTable.weeklyChest,
                    currencies: droptimizerTable.currencies,
                })
                .from(droptimizerTable)
                .orderBy(droptimizerTable.characterId, desc(droptimizerTable.simDate))
        )

        const results = await db
            .with(latestDroptimizerSq)
            .select({
                charId: charTable.id,
                droptimizerSimDate: latestDroptimizerSq.simDate,
                droptimizerIlvl: latestDroptimizerSq.ilvl,
                droptimizerTiersetInfo: latestDroptimizerSq.tiersetInfo,
                droptimizerWeeklyChest: latestDroptimizerSq.weeklyChest,
                droptimizerCurrencies: latestDroptimizerSq.currencies,
                blizzardEquippedIlvl: charBlizzardTable.equippedItemLevel,
                blizzardItemsEquipped: charBlizzardTable.itemsEquipped,
            })
            .from(charTable)
            .where(inArray(charTable.id, charIds))
            .leftJoin(
                latestDroptimizerSq,
                eq(charTable.id, latestDroptimizerSq.characterId)
            )
            .leftJoin(charBlizzardTable, eq(charBlizzardTable.characterId, charTable.id))

        return mapAndParse(
            results,
            (row) => ({
                charId: row.charId,
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

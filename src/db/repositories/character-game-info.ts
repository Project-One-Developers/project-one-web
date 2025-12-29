import { and, desc, eq, or } from "drizzle-orm"
import { db } from "@/db"
import { charRaiderioTable, charWowAuditTable, droptimizerTable } from "@/db/schema"
import type { GearItem } from "@/shared/models/item.model"

export type CharLookup = { name: string; realm: string }

// Compact version for roster display - only ilvl and tierset info
export type CharacterGameInfoCompact = {
    charName: string
    charRealm: string
    // Droptimizer fields (latest)
    droptimizerSimDate: number | null
    droptimizerIlvl: number | null
    droptimizerTiersetInfo: GearItem[] | null
    // WowAudit fields
    wowauditAvgIlvl: string | null
    wowauditTiersetInfo: GearItem[] | null
    // Raiderio fields
    raiderioAvgIlvl: string | null
    raiderioItemsEquipped: GearItem[] | null
}

export const characterGameInfoRepo = {
    /**
     * Compact query for roster display - combines droptimizer, wowaudit, raiderio
     * Returns only fields needed for ilvl and tierset count display
     */
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
                wowauditAvgIlvl: charWowAuditTable.averageItemLevel,
                wowauditTiersetInfo: charWowAuditTable.tiersetInfo,
                raiderioAvgIlvl: charRaiderioTable.averageItemLevel,
                raiderioItemsEquipped: charRaiderioTable.itemsEquipped,
            })
            .from(latestDroptimizerSq)
            .leftJoin(
                charWowAuditTable,
                and(
                    eq(charWowAuditTable.name, latestDroptimizerSq.characterName),
                    eq(charWowAuditTable.realm, latestDroptimizerSq.characterServer)
                )
            )
            .leftJoin(
                charRaiderioTable,
                and(
                    eq(charRaiderioTable.name, latestDroptimizerSq.characterName),
                    eq(charRaiderioTable.realm, latestDroptimizerSq.characterServer)
                )
            )

        return results
    },
}

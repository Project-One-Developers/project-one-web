import { and, desc, eq, type InferSelectModel, or } from "drizzle-orm"
import { db } from "@/db"
import { charWowAuditTable } from "@/db/schema"
import { mapAndParse } from "@/db/utils"
import {
    charWowAuditSchema,
    type CharacterWowAudit,
} from "@/shared/models/wowaudit.model"

// DB type definition for type-safe mapping
type DbCharWowAudit = InferSelectModel<typeof charWowAuditTable>

// Re-export the DB insert type for external use (e.g., in sync logic)
export type NewCharacterWowAudit = DbCharWowAudit

// Helper to create enchant piece from flat DB columns
function createEnchantPiece(
    name: string | null,
    quality: number | null
): { name: string; quality: number } | null {
    if (!name || !quality) {
        return null
    }
    return { name, quality }
}

// Mapper function: DB flat structure -> domain model nested structure
function mapDbToCharWowAudit(db: DbCharWowAudit): CharacterWowAudit {
    return {
        name: db.name,
        realm: db.realm,
        race: db.race,
        guildRank: db.guildRank,
        characterId: db.characterId,
        blizzardLastModifiedUnixTs: db.blizzardLastModifiedUnixTs,
        wowauditLastModifiedUnixTs: db.wowauditLastModifiedUnixTs,
        weekMythicDungeons: db.weekMythicDungeons,
        emptySockets: db.emptySockets,
        averageIlvl: db.averageItemLevel,
        hightestIlvlEverEquipped: db.highestIlvlEverEquipped,
        enchant: {
            wrist: createEnchantPiece(db.enchantNameWrist, db.enchantQualityWrist),
            legs: createEnchantPiece(db.enchantNameLegs, db.enchantQualityLegs),
            main_hand: createEnchantPiece(
                db.enchantNameMainHand,
                db.enchantQualityMainHand
            ),
            off_hand: createEnchantPiece(db.enchantNameOffHand, db.enchantQualityOffHand),
            finger1: createEnchantPiece(db.enchantNameFinger1, db.enchantQualityFinger1),
            finger2: createEnchantPiece(db.enchantNameFinger2, db.enchantQualityFinger2),
            back: createEnchantPiece(db.enchantNameBack, db.enchantQualityBack),
            chest: createEnchantPiece(db.enchantNameChest, db.enchantQualityChest),
            feet: createEnchantPiece(db.enchantNameFeet, db.enchantQualityFeet),
        },
        greatVault: {
            slot1: db.greatVaultSlot1,
            slot2: db.greatVaultSlot2,
            slot3: db.greatVaultSlot3,
            slot4: db.greatVaultSlot4,
            slot5: db.greatVaultSlot5,
            slot6: db.greatVaultSlot6,
            slot7: db.greatVaultSlot7,
            slot8: db.greatVaultSlot8,
            slot9: db.greatVaultSlot9,
        },
        itemsEquipped: db.itemsEquipped,
        tiersetInfo: db.tiersetInfo,
        bestItemsEquipped: db.bestItemsEquipped,
    }
}

export const wowauditRepo = {
    add: async (characters: NewCharacterWowAudit[]): Promise<void> => {
        if (characters.length === 0) {
            return
        }
        await db.insert(charWowAuditTable).values(characters)
    },

    getLastTimeSynced: async (): Promise<number | null> => {
        const result = await db
            .select()
            .from(charWowAuditTable)
            .orderBy(desc(charWowAuditTable.wowauditLastModifiedUnixTs))
            .limit(1)
            .then((r) => r.at(0))
        return result ? result.wowauditLastModifiedUnixTs : null
    },

    getByChar: async (
        charName: string,
        charRealm: string
    ): Promise<CharacterWowAudit | null> => {
        const result = await db
            .select()
            .from(charWowAuditTable)
            .where(
                and(
                    eq(charWowAuditTable.name, charName),
                    eq(charWowAuditTable.realm, charRealm)
                )
            )
            .then((r) => r.at(0))
        return result
            ? mapAndParse(result, mapDbToCharWowAudit, charWowAuditSchema)
            : null
    },

    getAll: async (): Promise<CharacterWowAudit[]> => {
        const result = await db.select().from(charWowAuditTable)
        return mapAndParse(result, mapDbToCharWowAudit, charWowAuditSchema)
    },

    deleteAll: async (): Promise<void> => {
        await db.delete(charWowAuditTable)
    },

    getByChars: async (
        chars: { name: string; realm: string }[]
    ): Promise<CharacterWowAudit[]> => {
        if (chars.length === 0) {
            return []
        }

        const result = await db
            .select()
            .from(charWowAuditTable)
            .where(
                or(
                    ...chars.map((c) =>
                        and(
                            eq(charWowAuditTable.name, c.name),
                            eq(charWowAuditTable.realm, c.realm)
                        )
                    )
                )
            )
        return mapAndParse(result, mapDbToCharWowAudit, charWowAuditSchema)
    },
}

import { eq, inArray } from "drizzle-orm"
import "server-only"
import { db } from "@/db"
import { bonusItemTrackTable } from "@/db/schema"
import { buildConflictUpdateColumns, mapAndParse } from "@/db/utils"
import { bonusItemTrackSchema, type BonusItemTrack } from "@/shared/models/item.models"
import type { WowItemTrackName } from "@/shared/models/wow.models"

// Helper to ensure name is cast to WowItemTrackName
const mapTrack = (row: typeof bonusItemTrackTable.$inferSelect): BonusItemTrack => ({
    ...row,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- DB stores valid track names validated at insertion
    name: row.name as WowItemTrackName,
})

export const bonusItemTrackRepo = {
    getAll: async (): Promise<BonusItemTrack[]> => {
        const tracks = await db.select().from(bonusItemTrackTable)
        return mapAndParse(tracks, mapTrack, bonusItemTrackSchema)
    },

    getByBonusId: async (id: number): Promise<BonusItemTrack | null> => {
        const res = await db
            .select()
            .from(bonusItemTrackTable)
            .where(eq(bonusItemTrackTable.id, id))
            .then((r) => r.at(0))
        return res ? mapAndParse(res, mapTrack, bonusItemTrackSchema) : null
    },

    getByBonusIds: async (ids: number[]): Promise<BonusItemTrack[]> => {
        if (ids.length === 0) {
            return []
        }
        const res = await db
            .select()
            .from(bonusItemTrackTable)
            .where(inArray(bonusItemTrackTable.id, ids))
        return mapAndParse(res, mapTrack, bonusItemTrackSchema)
    },

    getBySeason: async (season: number): Promise<BonusItemTrack[]> => {
        const res = await db
            .select()
            .from(bonusItemTrackTable)
            .where(eq(bonusItemTrackTable.season, season))
        return mapAndParse(res, mapTrack, bonusItemTrackSchema)
    },

    upsert: async (tracks: BonusItemTrack[]): Promise<void> => {
        if (tracks.length === 0) {
            return
        }

        await db
            .insert(bonusItemTrackTable)
            .values(tracks)
            .onConflictDoUpdate({
                target: bonusItemTrackTable.id,
                set: buildConflictUpdateColumns(bonusItemTrackTable, [
                    "level",
                    "max",
                    "name",
                    "fullName",
                    "itemLevel",
                    "maxItemLevel",
                    "season",
                ]),
            })
    },

    deleteAll: async (): Promise<void> => {
        await db.delete(bonusItemTrackTable)
    },
}

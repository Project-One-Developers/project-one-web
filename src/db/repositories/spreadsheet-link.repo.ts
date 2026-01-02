import { asc, eq } from "drizzle-orm"
import "server-only"
import { db } from "@/db"
import { spreadsheetLinkTable } from "@/db/schema"
import { identity, mapAndParse, newUUID } from "@/db/utils"
import {
    spreadsheetLinkSchema,
    type EditSpreadsheetLink,
    type NewSpreadsheetLink,
    type SpreadsheetLink,
} from "@/shared/models/spreadsheet-link.models"

export const spreadsheetLinkRepo = {
    getList: async (): Promise<SpreadsheetLink[]> => {
        const result = await db
            .select()
            .from(spreadsheetLinkTable)
            .orderBy(asc(spreadsheetLinkTable.order), asc(spreadsheetLinkTable.createdAt))
        return mapAndParse(result, identity, spreadsheetLinkSchema)
    },

    getById: async (id: string): Promise<SpreadsheetLink | null> => {
        const result = await db
            .select()
            .from(spreadsheetLinkTable)
            .where(eq(spreadsheetLinkTable.id, id))
            .then((r) => r.at(0))

        if (!result) {
            return null
        }

        return mapAndParse(result, identity, spreadsheetLinkSchema)
    },

    add: async (link: NewSpreadsheetLink): Promise<string> => {
        const id = newUUID()

        // Get max order to append at end
        const maxOrderResult = await db
            .select({ order: spreadsheetLinkTable.order })
            .from(spreadsheetLinkTable)
            .orderBy(asc(spreadsheetLinkTable.order))
            .then((r) => r.at(-1))

        const newOrder = (maxOrderResult?.order ?? -1) + 1

        await db.insert(spreadsheetLinkTable).values({
            id,
            title: link.title,
            url: link.url,
            order: newOrder,
        })

        return id
    },

    edit: async (edited: EditSpreadsheetLink): Promise<void> => {
        await db
            .update(spreadsheetLinkTable)
            .set({
                title: edited.title,
                url: edited.url,
            })
            .where(eq(spreadsheetLinkTable.id, edited.id))
    },

    delete: async (id: string): Promise<void> => {
        await db.delete(spreadsheetLinkTable).where(eq(spreadsheetLinkTable.id, id))
    },
}

import "server-only"
import { spreadsheetLinkRepo } from "@/db/repositories/spreadsheet-link.repo"
import type {
    EditSpreadsheetLink,
    NewSpreadsheetLink,
    SpreadsheetLink,
} from "@/shared/models/spreadsheet-link.models"

export const spreadsheetLinkService = {
    getList: async (): Promise<SpreadsheetLink[]> => {
        return spreadsheetLinkRepo.getList()
    },

    getById: async (id: string): Promise<SpreadsheetLink | null> => {
        return spreadsheetLinkRepo.getById(id)
    },

    add: async (link: NewSpreadsheetLink): Promise<SpreadsheetLink | null> => {
        const id = await spreadsheetLinkRepo.add(link)
        return spreadsheetLinkRepo.getById(id)
    },

    edit: async (edited: EditSpreadsheetLink): Promise<SpreadsheetLink | null> => {
        await spreadsheetLinkRepo.edit(edited)
        return spreadsheetLinkRepo.getById(edited.id)
    },

    delete: async (id: string): Promise<void> => {
        await spreadsheetLinkRepo.delete(id)
    },
}

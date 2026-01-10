"use server"

import { safeAction } from "@/lib/errors/action-wrapper"
import { spreadsheetLinkService } from "@/services/spreadsheet-link.service"
import type {
    EditSpreadsheetLink,
    NewSpreadsheetLink,
    SpreadsheetLink,
} from "@/shared/models/spreadsheet-link.models"

export const getSpreadsheetLinks = safeAction(async (): Promise<SpreadsheetLink[]> => {
    return spreadsheetLinkService.getList()
})

export const getSpreadsheetLinkById = safeAction(
    async (id: string): Promise<SpreadsheetLink | null> => {
        return spreadsheetLinkService.getById(id)
    }
)

export const addSpreadsheetLink = safeAction(
    async (link: NewSpreadsheetLink): Promise<SpreadsheetLink | null> => {
        return spreadsheetLinkService.add(link)
    }
)

export const editSpreadsheetLink = safeAction(
    async (edited: EditSpreadsheetLink): Promise<SpreadsheetLink | null> => {
        return spreadsheetLinkService.edit(edited)
    }
)

export const deleteSpreadsheetLink = safeAction(async (id: string): Promise<void> => {
    return spreadsheetLinkService.delete(id)
})

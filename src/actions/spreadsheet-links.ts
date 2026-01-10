"use server"

import { spreadsheetLinkRepo } from "@/db/repositories/spreadsheet-link.repo"
import { safeAction } from "@/lib/errors/action-wrapper"
import type {
    EditSpreadsheetLink,
    NewSpreadsheetLink,
    SpreadsheetLink,
} from "@/shared/models/spreadsheet-link.models"

export const getSpreadsheetLinks = safeAction(async (): Promise<SpreadsheetLink[]> => {
    return spreadsheetLinkRepo.getList()
})

export const getSpreadsheetLinkById = safeAction(
    async (id: string): Promise<SpreadsheetLink | null> => {
        return spreadsheetLinkRepo.getById(id)
    }
)

export const addSpreadsheetLink = safeAction(
    async (link: NewSpreadsheetLink): Promise<SpreadsheetLink | null> => {
        const id = await spreadsheetLinkRepo.add(link)
        return spreadsheetLinkRepo.getById(id)
    }
)

export const editSpreadsheetLink = safeAction(
    async (edited: EditSpreadsheetLink): Promise<SpreadsheetLink | null> => {
        await spreadsheetLinkRepo.edit(edited)
        return spreadsheetLinkRepo.getById(edited.id)
    }
)

export const deleteSpreadsheetLink = safeAction(async (id: string): Promise<void> => {
    await spreadsheetLinkRepo.delete(id)
})

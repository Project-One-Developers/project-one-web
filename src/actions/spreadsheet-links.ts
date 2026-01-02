"use server"

import { spreadsheetLinkService } from "@/services/spreadsheet-link.service"
import type {
    EditSpreadsheetLink,
    NewSpreadsheetLink,
    SpreadsheetLink,
} from "@/shared/models/spreadsheet-link.models"

export async function getSpreadsheetLinks(): Promise<SpreadsheetLink[]> {
    return spreadsheetLinkService.getList()
}

export async function addSpreadsheetLink(
    link: NewSpreadsheetLink
): Promise<SpreadsheetLink | null> {
    return spreadsheetLinkService.add(link)
}

export async function editSpreadsheetLink(
    edited: EditSpreadsheetLink
): Promise<SpreadsheetLink | null> {
    return spreadsheetLinkService.edit(edited)
}

export async function deleteSpreadsheetLink(id: string): Promise<void> {
    return spreadsheetLinkService.delete(id)
}

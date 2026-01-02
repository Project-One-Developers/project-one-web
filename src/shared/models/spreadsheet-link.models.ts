import { z } from "zod"

// Base schema for DB responses
export const spreadsheetLinkSchema = z.object({
    id: z.string(),
    title: z.string().min(1).max(100),
    url: z.url(),
    order: z.number().int(),
    createdAt: z.date(),
})
export type SpreadsheetLink = z.infer<typeof spreadsheetLinkSchema>

// Schema for creating new links
export const newSpreadsheetLinkSchema = z.object({
    title: z.string().min(1, "Title is required").max(100, "Title too long"),
    url: z.url("Must be a valid URL"),
})
export type NewSpreadsheetLink = z.infer<typeof newSpreadsheetLinkSchema>

// Schema for editing links
export const editSpreadsheetLinkSchema = z.object({
    id: z.string(),
    title: z.string().min(1, "Title is required").max(100, "Title too long"),
    url: z.url("Must be a valid URL"),
})
export type EditSpreadsheetLink = z.infer<typeof editSpreadsheetLinkSchema>

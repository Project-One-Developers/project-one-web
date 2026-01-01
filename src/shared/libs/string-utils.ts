import { ZodError } from "zod"

/**
 * Safely converts any value to a string for use in template literals.
 * Handles errors, Zod errors, primitives, and objects.
 */
const safeStringify = (value: unknown): string => {
    if (value === null) {
        return "null"
    }
    if (value === undefined) {
        return "undefined"
    }
    if (value instanceof ZodError) {
        return value.issues
            .map((err) => `${err.path.join(".")}: ${err.message}`)
            .join(", ")
    }
    if (value instanceof Error) {
        return value.message
    }
    if (typeof value === "string") {
        return value
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value)
    }
    if (typeof value === "bigint") {
        return value.toString()
    }
    if (value instanceof Date) {
        return value.toISOString()
    }
    try {
        return JSON.stringify(value)
    } catch {
        return "[Unserializable]"
    }
}
export const s = safeStringify

/**
 * Convert a name to a slug (lowercase, spaces to hyphens, remove special chars)
 */
export function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/['']/g, "") // Remove apostrophes
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, "") // Trim leading/trailing hyphens
}

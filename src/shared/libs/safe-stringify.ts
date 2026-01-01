import { ZodError } from "zod"

/**
 * Safely converts any value to a string for use in template literals.
 * Handles errors, Zod errors, primitives, and objects.
 */
export const safeStringify = (value: unknown): string => {
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

/**
 * Shorthand alias for safeStringify
 */
export const s = safeStringify

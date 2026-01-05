import "server-only"

/**
 * Strips officer-only fields from data before returning to non-officers.
 * Works with single objects or arrays.
 */
export function stripOfficerFields<T extends { priority?: number }>(
    data: T
): Omit<T, "priority">
export function stripOfficerFields<T extends { priority?: number }>(
    data: T[]
): Omit<T, "priority">[]
export function stripOfficerFields<T extends { priority?: number }>(
    data: T | T[]
): Omit<T, "priority"> | Omit<T, "priority">[] {
    if (Array.isArray(data)) {
        return data.map(({ priority: _, ...rest }) => rest)
    }
    const { priority: _, ...rest } = data
    return rest
}

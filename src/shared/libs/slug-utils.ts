/**
 * Slug utility functions
 * Converts strings to URL-friendly slugs
 */

/**
 * Convert a string to a URL-friendly slug
 *
 * @param text - The text to convert
 * @returns A lowercase slug with only alphanumeric characters and hyphens
 *
 * @example
 * toSlug("Liberation of Undermine") // "liberation-of-undermine"
 * toSlug("Queen Ansurek") // "queen-ansurek"
 */
export function toSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
}

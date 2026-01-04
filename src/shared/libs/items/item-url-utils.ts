/**
 * URL helper functions for WoW items
 * Computes icon and wowhead URLs on the fly instead of storing them
 */

const ICON_URL_BASE = "https://wow.zamimg.com/images/wow/icons/large"
const WOWHEAD_ITEM_BASE = "https://www.wowhead.com/item"

/** Default icon name when icon is missing */
export const DEFAULT_ICON_NAME = "inv_misc_questionmark"

/**
 * Get the icon URL for an item given its icon name
 * @param iconName - The icon name (e.g., "inv_sword_2h_nerubianraid_d_01")
 */
export function getIconUrl(iconName: string): string {
    return `${ICON_URL_BASE}/${iconName}.jpg`
}

/**
 * Extract icon name from a full icon URL
 * Supports both zamimg and Blizzard render URLs
 * @param url - Full icon URL (e.g., "https://render.worldofwarcraft.com/us/icons/56/inv_sword.jpg")
 * @returns Icon name (e.g., "inv_sword") or default icon name if extraction fails
 */
export function extractIconNameFromUrl(url: string | null | undefined): string {
    if (!url) {
        return DEFAULT_ICON_NAME
    }
    // Extract filename from URL and remove .jpg extension
    const match = /\/([^/]+)\.jpg$/i.exec(url)
    return match?.[1] ?? DEFAULT_ICON_NAME
}

/**
 * Get the Wowhead URL for an item
 * @param itemId - The WoW item ID
 * @param ilvl - Optional item level to include
 * @param bonusIds - Optional bonus IDs to include
 */
export function getWowheadItemUrl(
    itemId: number,
    ilvl?: number,
    bonusIds?: number[]
): string {
    let url = `${WOWHEAD_ITEM_BASE}=${String(itemId)}`
    if (ilvl) {
        url += `&ilvl=${String(ilvl)}`
    }
    if (bonusIds?.length) {
        url += `&bonus=${bonusIds.join(":")}`
    }
    return url
}

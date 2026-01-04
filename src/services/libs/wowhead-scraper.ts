/**
 * Wowhead scraper module
 * Scrapes item data from Wowhead for specs, stats, and descriptions
 * Ported from Python raid-items script (scraper.py)
 */
import * as cheerio from "cheerio"
import pLimit from "p-limit"
import "server-only"
import { fetchWithRetry } from "@/lib/fetch-with-retry"
import { logger } from "@/lib/logger"
import { s } from "@/shared/libs/string-utils"

// Concurrent scraping limit (matching Python's 40)
const CONCURRENT_LIMIT = 40
const wowheadRateLimit = pLimit(CONCURRENT_LIMIT)

// User agent for requests
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

export type WowheadItemData = {
    specs: number[]
    stats: string[]
    description: string | null
    wowheadUrl: string
}

/**
 * Scrape a single item from Wowhead
 */
async function scrapeItem(itemId: number): Promise<WowheadItemData | null> {
    const url = `https://www.wowhead.com/item=${s(itemId)}`

    try {
        const response = await fetchWithRetry(
            url,
            {
                headers: {
                    "User-Agent": USER_AGENT,
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                },
                cache: "no-store",
            },
            { maxRetries: 2 } // Fewer retries for batch scraping
        )

        const html = await response.text()
        const $ = cheerio.load(html)

        // Parse specs from #lootspecs div
        const specs: number[] = []
        const lootSpecsDiv = $("#lootspecs")
        if (lootSpecsDiv.length > 0) {
            lootSpecsDiv.find("div.iconsmall").each((_, el) => {
                const classes = $(el).attr("class") ?? ""
                const specMatch = /spec(\d+)/.exec(classes)
                if (specMatch?.[1]) {
                    specs.push(parseInt(specMatch[1], 10))
                }
            })
        }

        // Parse stats from spans starting with +
        const stats: string[] = []
        $("span").each((_, el) => {
            const text = $(el).text()
            if (text.startsWith("+")) {
                // Remove + and commas, keep the stat text
                const statText = text.replace("+", "").replace(/,/g, "")
                if (statText.trim()) {
                    stats.push(statText.trim())
                }
            }
        })
        // Sort by numeric value descending
        stats.sort((a, b) => {
            const numA = parseInt(a.split(" ")[0] ?? "0", 10) || 0
            const numB = parseInt(b.split(" ")[0] ?? "0", 10) || 0
            return numB - numA
        })

        // Parse description from a.q2 elements
        let description: string | null = null
        const descElement = $("a.q2").first()
        if (descElement.length > 0) {
            description = descElement.text().trim() || null
        }

        return {
            specs: [...new Set(specs)].sort((a, b) => a - b),
            stats,
            description,
            wowheadUrl: url,
        }
    } catch (error) {
        logger.warn("WowheadScraper", `Error scraping item ${s(itemId)}: ${s(error)}`)
        return null
    }
}

/**
 * Scrape a single item with rate limiting
 */
async function scrapeWowheadItem(itemId: number): Promise<WowheadItemData | null> {
    return wowheadRateLimit(() => scrapeItem(itemId))
}

/**
 * Scrape multiple items in parallel with rate limiting
 * Returns a Map of itemId -> WowheadItemData (null entries excluded)
 */
export async function scrapeWowheadBatch(
    itemIds: number[],
    options?: { onProgress?: (completed: number, total: number) => void }
): Promise<Map<number, WowheadItemData>> {
    logger.info("WowheadScraper", `Starting batch scrape of ${s(itemIds.length)} items`)

    const results = new Map<number, WowheadItemData>()
    let completed = 0
    let failed = 0

    const promises = itemIds.map(async (itemId) => {
        const data = await scrapeWowheadItem(itemId)
        completed++

        if (data) {
            results.set(itemId, data)
        } else {
            failed++
        }

        // Report progress every 100 items
        if (completed % 100 === 0 || completed === itemIds.length) {
            logger.debug(
                "WowheadScraper",
                `Progress: ${s(completed)}/${s(itemIds.length)} (${s(failed)} failed)`
            )
            options?.onProgress?.(completed, itemIds.length)
        }
    })

    await Promise.all(promises)

    logger.info(
        "WowheadScraper",
        `Completed batch scrape: ${s(results.size)} succeeded, ${s(failed)} failed`
    )

    return results
}

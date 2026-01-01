import { DateTime } from "luxon"
import { match } from "ts-pattern"
import { s } from "@/shared/libs/string-utils"

// Constants
const WOW_LAUNCH_UNIX = 1101254400 // WoW launch date (Wednesday, Nov 24, 2004)
const SECONDS_PER_DAY = 86400

// ============================================================================
// Core timestamp utilities
// ============================================================================

/** Returns the current Unix timestamp in seconds. */
export const getUnixTimestamp = (): number => DateTime.now().toSeconds()

/** Converts an ISO 8601 datetime string to a Unix timestamp in seconds. */
export const isoToUnixTimestamp = (isoDateTime: string): number =>
    DateTime.fromISO(isoDateTime).toSeconds()

// ============================================================================
// Relative time utilities
// ============================================================================

/** Converts a Unix timestamp to the number of days relative to the current date. */
export const unixTimestampToRelativeDays = (unixTimestamp: number): number =>
    Math.round(DateTime.now().diff(DateTime.fromSeconds(unixTimestamp), "days").days)

/** Formats a Unix timestamp to a relative day string (e.g., "Today", "Yesterday", "X days ago"). */
export const formatUnixTimestampToRelativeDays = (unixTimestamp: number): string =>
    match(unixTimestampToRelativeDays(unixTimestamp))
        .with(0, () => "Today")
        .with(1, () => "Yesterday")
        .otherwise((days) => `${s(days)} days ago`)

// ============================================================================
// WoW week utilities
// ============================================================================

/** Converts a Unix timestamp to the World of Warcraft week number. */
export const unixTimestampToWowWeek = (unixTimestamp: number): number =>
    Math.floor((unixTimestamp - WOW_LAUNCH_UNIX) / SECONDS_PER_DAY / 7)

/** Gets the current World of Warcraft week number. */
export const currentWowWeek = (): number => unixTimestampToWowWeek(getUnixTimestamp())

/** Checks if the given Unix timestamp falls within the current WoW week. */
export const isInCurrentWowWeek = (dateUnixTs: number): boolean =>
    currentWowWeek() === unixTimestampToWowWeek(dateUnixTs)

/** Formats the WoW week number to a date range string (e.g., "24/11/2004 - 30/11/2004"). */
export const formatWowWeek = (wowWeek?: number): string => {
    const week = wowWeek ?? currentWowWeek()
    const startDate = DateTime.fromSeconds(WOW_LAUNCH_UNIX).plus({ weeks: week })
    const endDate = startDate.plus({ days: 6 })
    return `${startDate.toFormat("dd/MM/yyyy")} - ${endDate.toFormat("dd/MM/yyyy")}`
}

// ============================================================================
// Formatting utilities
// ============================================================================

/** Formats a Unix timestamp to an Italian date string (e.g., "lunedì, 1 gennaio, 12:00"). */
export const formatUnixTimestampToItalianDate = (unixTimestamp: number): string =>
    DateTime.fromSeconds(unixTimestamp).setLocale("it-IT").toFormat("cccc, d MMMM, HH:mm")

/** Formats a Unix timestamp for display in DD/MM/YYYY HH:MM format. */
export const formatUnixTimestampForDisplay = (unixTimestamp: number): string =>
    DateTime.fromSeconds(unixTimestamp).toFormat("dd/MM/yyyy HH:mm")

// ============================================================================
// Parsing utilities
// ============================================================================

/** Parses a date string in "DD/MM/YYYY HH:MM" format to a Unix timestamp. */
export const parseStringToUnixTimestamp = (dateString: string): number => {
    const dt = DateTime.fromFormat(dateString, "dd/MM/yyyy HH:mm")
    if (!dt.isValid) {
        throw new Error(`Invalid date string format: ${dateString}`)
    }
    return dt.toSeconds()
}

/**
 * Parses date and time strings from addon exports to Unix timestamp.
 * Used by loot parsers (MRT, RC Loot Council exports).
 * @param dateStr - Date string in YYYY/M/D format
 * @param timeStr - Time string in HH:mm:ss format
 */
export const parseDateTimeFromAddon = (dateStr: string, timeStr: string): number => {
    const dt = DateTime.fromFormat(`${dateStr} ${timeStr}`, "yyyy/M/d HH:mm:ss")
    if (!dt.isValid) {
        throw new Error(`Unable to parse date/time: ${dateStr} ${timeStr}`)
    }
    return dt.toSeconds()
}

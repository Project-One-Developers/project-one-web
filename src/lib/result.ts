/**
 * Result utilities for server action error handling.
 *
 * Next.js production builds strip error messages from thrown exceptions for security.
 * Instead of throwing, server actions should return Result<T> to communicate errors
 * as data, ensuring error messages are visible to users in production.
 */
import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"
import type { Result, VoidResult } from "@/shared/types/types"

/**
 * Creates a successful Result with data.
 */
export function ok<T>(data: T): Result<T> {
    return { success: true, data }
}

/**
 * Creates a successful VoidResult.
 */
export function okVoid(): VoidResult {
    return { success: true }
}

/**
 * Creates a failed Result with an error message.
 * Optionally logs the error server-side for debugging.
 *
 * @param error - User-friendly error message to display
 * @param context - Optional logging context (e.g., "Characters", "Blizzard")
 */
export function fail<T = never>(error: string, context?: string): Result<T> {
    if (context) {
        logger.error(context, error)
    }
    return { success: false, error }
}

/**
 * Creates a failed VoidResult with an error message.
 * Optionally logs the error server-side for debugging.
 */
export function failVoid(error: string, context?: string): VoidResult {
    if (context) {
        logger.error(context, error)
    }
    return { success: false, error }
}

/**
 * Wraps an async function, converting exceptions to Result type.
 * Use this for operations that return data.
 *
 * @param fn - Async function that may throw
 * @param context - Logging context (e.g., "Characters", "Blizzard")
 * @param errorMessage - Optional custom error message (defaults to error.message)
 */
export async function tryCatch<T>(
    fn: () => Promise<T>,
    context: string,
    errorMessage?: string
): Promise<Result<T>> {
    try {
        const data = await fn()
        return { success: true, data }
    } catch (error) {
        const msg =
            errorMessage ?? (error instanceof Error ? error.message : "Unknown error")
        logger.error(context, `${msg}: ${s(error)}`)
        return { success: false, error: msg }
    }
}

/**
 * Wraps an async function, converting exceptions to VoidResult.
 * Use this for operations that don't return data.
 */
export async function tryCatchVoid(
    fn: () => Promise<void>,
    context: string,
    errorMessage?: string
): Promise<VoidResult> {
    try {
        await fn()
        return { success: true }
    } catch (error) {
        const msg =
            errorMessage ?? (error instanceof Error ? error.message : "Unknown error")
        logger.error(context, `${msg}: ${s(error)}`)
        return { success: false, error: msg }
    }
}

/**
 * Type guard to check if a Result is successful.
 */
export function isSuccess<T>(result: Result<T>): result is { success: true; data: T } {
    return result.success
}

/**
 * Type guard to check if a Result is a failure.
 */
export function isFailure<T>(
    result: Result<T>
): result is { success: false; error: string } {
    return !result.success
}

/**
 * Unwraps a Result, throwing if it's a failure.
 * Use this when you need to chain operations that use Result pattern internally.
 */
export function unwrap<T>(result: Result<T>): T {
    if (result.success) {
        return result.data
    }
    throw new Error(result.error)
}

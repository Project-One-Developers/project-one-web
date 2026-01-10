import "server-only"
import { ZodError } from "zod"
import { logger } from "@/lib/logger"
import { s } from "@/shared/libs/string-utils"
import type { Result } from "@/shared/types"
import { AppError, ValidationError, type SerializedAppError } from "./app-error"

/** Result type that carries serialized error info for client consumption */
export type ActionResult<T> = Result<T, SerializedAppError>

const GENERIC_ERROR_MESSAGE = "An unexpected error occurred. Please try again."

/**
 * Wraps a server action function with standardized error handling.
 *
 * - Catches all errors and returns Result objects
 * - AppError messages are shown to users (they're safe)
 * - Unknown errors get generic message + server-side logging
 * - ZodErrors are converted to ValidationErrors
 *
 * @example
 * export const addCharacter = safeAction(async (data: NewCharacter) => {
 *     await requireOfficer()
 *     return characterService.add(data)
 * })
 */
export function safeAction<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<ActionResult<TResult>> {
    return async (...args: TArgs): Promise<ActionResult<TResult>> => {
        try {
            const result = await fn(...args)
            return { success: true, data: result }
        } catch (error) {
            return handleActionError(error)
        }
    }
}

type ActionErrorResult = { success: false; error: SerializedAppError }

function handleActionError(error: unknown): ActionErrorResult {
    // ZodError -> ValidationError
    if (error instanceof ZodError) {
        const validationError = ValidationError.fromZod(error)
        logger.warn("Action", `Validation error - ${s(validationError.message)}`)
        return { success: false, error: validationError.toJSON() }
    }

    // AppError - safe to show to user
    if (error instanceof AppError) {
        logger.warn("Action", `${error.name} - ${s(error.message)}`)
        return { success: false, error: error.toJSON() }
    }

    // Unknown error - log full details, return generic message
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    logger.error("Action", `Unexpected error - ${s(errorMessage)}`, errorStack)

    const genericError = new AppError(GENERIC_ERROR_MESSAGE)
    return { success: false, error: genericError.toJSON() }
}

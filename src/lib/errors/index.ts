// Client-side helper to unwrap ActionResult
import type { ActionResult } from "./action-wrapper"
import { ActionError } from "./app-error"

// Error codes
export { ERROR_CODES, type ErrorCode } from "./error-codes"

// Error classes (can be used on both client and server)
export {
    AppError,
    ValidationError,
    NotFoundError,
    AuthError,
    ForbiddenError,
    ApiError,
    BlizzardApiError,
    RateLimitError,
    ConflictError,
    ParseError,
    ActionError,
    isAppError,
    isErrorCode,
    isActionError,
    type SerializedAppError,
} from "./app-error"

// Action wrapper (server-only) - import directly from "./action-wrapper"
// when needed to avoid bundling server code in client

// Re-export action result types for client use
export type { ActionResult } from "./action-wrapper"

/**
 * Unwraps an ActionResult, throwing ActionError on failure.
 * Use in React Query queryFn or mutation handlers.
 *
 * @example
 * queryFn: () => unwrap(someAction())
 */
export async function unwrap<T>(resultPromise: Promise<ActionResult<T>>): Promise<T> {
    const result = await resultPromise
    if (!result.success) {
        throw new ActionError(result.error)
    }
    return result.data
}

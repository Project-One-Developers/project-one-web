import { ZodError } from "zod"
import { ERROR_CODES, type ErrorCode } from "./error-codes"

/**
 * Serialized form of AppError for transmission across server/client boundary.
 */
export type SerializedAppError = {
    name: string
    message: string
    code: ErrorCode
    statusCode: number
    fieldErrors?: Record<string, string[]>
}

/**
 * Base application error class.
 * All operational errors (safe to show to users) extend this class.
 */
export class AppError extends Error {
    /** Marks this as a known, operational error (safe to show message to users) */
    readonly isOperational = true
    /** Error code for client-side logic */
    readonly code: ErrorCode
    /** HTTP-like status code for categorization */
    readonly statusCode: number
    /** Original error if this wraps another error */
    readonly cause?: Error

    constructor(
        message: string,
        code: ErrorCode = ERROR_CODES.INTERNAL_ERROR,
        statusCode = 500,
        cause?: Error
    ) {
        super(message)
        this.name = this.constructor.name
        this.code = code
        this.statusCode = statusCode
        this.cause = cause

        // Maintains proper stack trace in V8 environments
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- captureStackTrace may not exist in non-V8 environments
        Error.captureStackTrace?.(this, this.constructor)
    }

    /**
     * Serialize for transmission across server/client boundary
     */
    toJSON(): SerializedAppError {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
        }
    }
}

/**
 * Validation errors (form input, Zod parsing, etc.)
 */
export class ValidationError extends AppError {
    readonly fieldErrors?: Record<string, string[]>

    constructor(message: string, fieldErrors?: Record<string, string[]>) {
        super(message, ERROR_CODES.VALIDATION_ERROR, 400)
        this.fieldErrors = fieldErrors
    }

    override toJSON(): SerializedAppError {
        return {
            ...super.toJSON(),
            fieldErrors: this.fieldErrors,
        }
    }

    static fromZod(zodError: ZodError): ValidationError {
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of zodError.issues) {
            const path = issue.path.join(".") || "_root"
            fieldErrors[path] ??= []
            fieldErrors[path].push(issue.message)
        }
        const message = zodError.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join(", ")
        return new ValidationError(message, fieldErrors)
    }
}

/**
 * Resource not found (character, player, item, etc.)
 */
export class NotFoundError extends AppError {
    readonly resourceType: string
    readonly resourceId?: string

    constructor(resourceType: string, resourceId?: string) {
        const message = resourceId
            ? `${resourceType} "${resourceId}" not found`
            : `${resourceType} not found`
        super(message, ERROR_CODES.NOT_FOUND, 404)
        this.resourceType = resourceType
        this.resourceId = resourceId
    }
}

/**
 * Authentication errors (not logged in)
 */
export class AuthError extends AppError {
    constructor(message = "Authentication required") {
        super(message, ERROR_CODES.UNAUTHORIZED, 401)
    }
}

/**
 * Authorization errors (logged in but no permission)
 */
export class ForbiddenError extends AppError {
    constructor(message = "You don't have permission to perform this action") {
        super(message, ERROR_CODES.FORBIDDEN, 403)
    }
}

/**
 * External API errors (Blizzard, Raidbots, Discord, etc.)
 */
export class ApiError extends AppError {
    readonly service: string
    readonly originalStatus?: number

    constructor(service: string, message: string, originalStatus?: number) {
        super(`${service} API error: ${message}`, ERROR_CODES.EXTERNAL_API_ERROR, 502)
        this.service = service
        this.originalStatus = originalStatus
    }
}

/**
 * Blizzard-specific API error
 */
export class BlizzardApiError extends AppError {
    readonly originalStatus?: number

    constructor(message: string, originalStatus?: number) {
        super(`Blizzard API error: ${message}`, ERROR_CODES.BLIZZARD_API_ERROR, 502)
        this.originalStatus = originalStatus
    }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
    readonly retryAfter?: number

    constructor(
        message = "Too many requests, please try again later",
        retryAfter?: number
    ) {
        super(message, ERROR_CODES.RATE_LIMITED, 429)
        this.retryAfter = retryAfter
    }
}

/**
 * Conflict errors (duplicate entry, concurrent modification)
 */
export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, ERROR_CODES.CONFLICT, 409)
    }
}

/**
 * Parse/import errors (CSV parsing, Droptimizer parsing, etc.)
 */
export class ParseError extends AppError {
    constructor(message: string, cause?: Error) {
        super(message, ERROR_CODES.PARSE_ERROR, 400, cause)
    }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError
}

/**
 * Type guard to check if a serialized error has a specific code
 */
export function isErrorCode(error: SerializedAppError, code: ErrorCode): boolean {
    return error.code === code
}

/**
 * Error class that wraps a SerializedAppError for throwing.
 * This satisfies the `@typescript-eslint/only-throw-error` rule while
 * preserving the serialized error data.
 */
export class ActionError extends Error {
    readonly serialized: SerializedAppError

    constructor(serialized: SerializedAppError) {
        super(serialized.message)
        this.name = "ActionError"
        this.serialized = serialized
    }
}

/**
 * Type guard to check if an error is an ActionError
 */
export function isActionError(error: unknown): error is ActionError {
    return error instanceof ActionError
}

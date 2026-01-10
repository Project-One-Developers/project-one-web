export const ERROR_CODES = {
    // Auth
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",

    // Validation
    VALIDATION_ERROR: "VALIDATION_ERROR",

    // Resources
    NOT_FOUND: "NOT_FOUND",
    CONFLICT: "CONFLICT",

    // External APIs
    EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",
    BLIZZARD_API_ERROR: "BLIZZARD_API_ERROR",
    DISCORD_API_ERROR: "DISCORD_API_ERROR",
    RAIDBOTS_API_ERROR: "RAIDBOTS_API_ERROR",

    // Rate limiting
    RATE_LIMITED: "RATE_LIMITED",

    // Parsing
    PARSE_ERROR: "PARSE_ERROR",

    // Internal
    INTERNAL_ERROR: "INTERNAL_ERROR",
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

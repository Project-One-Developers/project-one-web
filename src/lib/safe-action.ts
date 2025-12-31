import { createSafeActionClient } from "next-safe-action"
import { auth } from "@/auth"
import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"

/**
 * Custom error class for user-facing errors.
 * These errors will have their message returned to the client.
 * Use this for validation errors, not-found errors, etc.
 */
export class ActionError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "ActionError"
    }
}

/**
 * Base action client - no auth required.
 * Use this for public actions (if any).
 */
export const actionClient = createSafeActionClient({
    handleServerError: (error) => {
        // Log all errors
        logger.error("Action", s(error))

        // Return user-facing message for ActionError
        if (error instanceof ActionError) {
            return error.message
        }

        // Generic message for unexpected errors
        return "An unexpected error occurred"
    },
})

/**
 * Auth-protected action client - requires session.
 * Use this for all authenticated actions.
 */
export const authActionClient = actionClient.use(async ({ next }) => {
    const session = await auth()

    if (!session?.user?.id) {
        throw new ActionError("You must be logged in to perform this action")
    }

    return next({
        ctx: { userId: session.user.id },
    })
})

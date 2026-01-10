import "server-only"
import { auth } from "@/auth"
import { AuthError, ForbiddenError } from "@/lib/errors"

/**
 * Throws an error if the current user doesn't have officer role.
 * Use in server actions that require officer-only access for defense in depth.
 */
export async function requireOfficer(): Promise<void> {
    const session = await auth()

    if (!session?.user.role) {
        throw new AuthError("You must be logged in to perform this action")
    }

    if (session.user.role !== "officer") {
        throw new ForbiddenError("This action requires officer privileges")
    }
}

/**
 * Checks if the current user is an officer.
 */
export async function isOfficer(): Promise<boolean> {
    const session = await auth()
    return session?.user.role === "officer"
}

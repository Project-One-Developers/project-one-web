import "server-only"
import { auth } from "@/auth"

/**
 * Throws an error if the current user doesn't have officer role.
 * Use in server actions that require officer-only access for defense in depth.
 */
export async function requireOfficer(): Promise<void> {
    const session = await auth()

    if (!session?.user.role) {
        throw new Error("Unauthorized: Not authenticated")
    }

    if (session.user.role !== "officer") {
        throw new Error("Unauthorized: Officer access required")
    }
}

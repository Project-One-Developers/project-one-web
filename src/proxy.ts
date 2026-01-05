import NextAuth from "next-auth"
import authConfig from "@/auth.config"

/**
 * Next.js 16 Proxy (formerly Middleware) for authentication.
 * Uses Auth.js authorized callback for route protection.
 *
 * Route rules are defined in auth.config.ts for centralized management.
 */
const { auth } = NextAuth(authConfig)

export default auth

export const config = {
    matcher: [
        // Run on all routes except static assets
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
}

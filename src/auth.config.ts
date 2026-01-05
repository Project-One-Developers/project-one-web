import type { NextAuthConfig } from "next-auth"
import Discord from "next-auth/providers/discord"
import { logger } from "@/lib/logger"
import { userRoleSchema } from "@/shared/models/auth.models"

/**
 * Route protection configuration.
 * Exported for reuse in navigation components.
 */
export const routeConfig = {
    /** Public routes - no authentication required */
    public: ["/login"],

    /** Member routes - any authenticated user (officer or member) */
    member: ["/", "/character", "/loot-recap", "/mount-tracker", "/raid-progression"],

    /** Officer routes - require officer role */
    officer: [
        "/roster",
        "/droptimizer",
        "/sync",
        "/settings",
        "/assign",
        "/loot-table",
        "/loot-gains",
        "/raid-session",
        "/summary",
        "/spreadsheets",
    ],
} as const

/**
 * Edge-compatible Auth.js configuration.
 * Used by proxy for route protection. Does not include server-only code.
 */
const authConfig: NextAuthConfig = {
    providers: [
        Discord({
            authorization: {
                params: {
                    scope: "identify guilds.members.read",
                },
            },
        }),
    ],
    pages: {
        signIn: "/login",
        error: "/login",
    },
    callbacks: {
        authorized({ auth, request }) {
            const { pathname } = request.nextUrl
            const userRole = auth?.user.role

            const isPublicRoute = routeConfig.public.some((r) => pathname.startsWith(r))
            const isMemberRoute = routeConfig.member.some((r) => pathname.startsWith(r))
            const isOfficerRoute = routeConfig.officer.some((r) => pathname.startsWith(r))
            const isApiRoute = pathname.startsWith("/api/")

            // Public routes - allow, but redirect authenticated users away from login
            if (isPublicRoute) {
                if (pathname === "/login" && userRole) {
                    return Response.redirect(new URL("/", request.url))
                }
                return true
            }

            // API routes - skip (handled by their own auth mechanisms)
            if (isApiRoute) {
                return true
            }

            // All other routes require authentication
            if (!userRole) {
                return false // Redirects to signIn page
            }

            // Officer routes require officer role
            if (isOfficerRoute) {
                return userRole === "officer"
                    ? true
                    : Response.redirect(new URL("/", request.url))
            }

            // Member routes - any authenticated user
            if (isMemberRoute) {
                return true
            }

            // DEFAULT DENY: Route not in any list = blocked
            // If you hit this, add the route to routeConfig above
            logger.warn("Proxy", `Blocked unlisted route: ${pathname}`)
            return Response.redirect(new URL("/", request.url))
        },
        // Parse role from JWT token - needed for proxy to read session.user.role
        session({ session, token }) {
            session.user.id = token.sub ?? ""
            const parsed = userRoleSchema.safeParse(token.role)
            session.user.role = parsed.success ? parsed.data : undefined
            return session
        },
    },
}

export default authConfig

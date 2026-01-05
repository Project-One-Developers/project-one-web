import NextAuth from "next-auth"
import "server-only"
import authConfig from "@/auth.config"
import { env } from "@/env"
import { logger } from "@/lib/logger"
import { s } from "@/shared/libs/string-utils"
import type { UserRole } from "@/shared/models/auth.models"

// Helper to determine user role from Discord roles
function determineUserRole(userRoles: string[]): UserRole | null {
    const officerRoles = env.DISCORD_OFFICER_ROLES_IDS
    const memberRoles = env.DISCORD_MEMBER_ROLES_IDS

    // Check officer roles first (higher priority)
    const isOfficer = userRoles.some((role) => officerRoles.includes(role))
    if (isOfficer) {
        return "officer"
    }

    // Check member roles
    const isMember =
        memberRoles.length > 0 && userRoles.some((role) => memberRoles.includes(role))
    if (isMember) {
        return "member"
    }

    return null
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ account, profile }) {
            if (!profile?.id || !account?.access_token) {
                return false
            }

            const guildId = env.DISCORD_GUILD_ID

            try {
                // Fetch user's membership in the guild
                const res = await fetch(
                    `https://discord.com/api/users/@me/guilds/${guildId}/member`,
                    {
                        headers: {
                            Authorization: `Bearer ${account.access_token}`,
                        },
                    }
                )

                if (!res.ok) {
                    logger.info(
                        "Auth",
                        `User ${s(profile.username)} (${s(profile.id)}) is not in the guild`
                    )
                    return false
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Discord API response
                const member = (await res.json()) as { roles?: string[] }
                const userRoles: string[] = member.roles ?? []

                // Determine user role
                const role = determineUserRole(userRoles)

                if (!role) {
                    logger.info(
                        "Auth",
                        `Access denied for ${s(profile.username)} - missing required role`
                    )
                    return false
                }

                logger.info(
                    "Auth",
                    `Access granted for ${s(profile.username)} as ${s(role)}`
                )
                return true
            } catch (error) {
                logger.error("Auth", `Error checking Discord roles: ${s(error)}`)
                return false
            }
        },
        async jwt({ token, account, profile }) {
            // On initial sign-in, determine and store the role
            if (account && profile?.id) {
                const guildId = env.DISCORD_GUILD_ID

                try {
                    const res = await fetch(
                        `https://discord.com/api/users/@me/guilds/${guildId}/member`,
                        {
                            headers: {
                                Authorization: `Bearer ${account.access_token ?? ""}`,
                            },
                        }
                    )

                    if (res.ok) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Discord API response
                        const member = (await res.json()) as { roles?: string[] }
                        const userRoles: string[] = member.roles ?? []
                        // signIn callback already validated - role should exist
                        token.role = determineUserRole(userRoles) ?? undefined
                    }
                } catch {
                    // Role fetch failed - token.role stays undefined
                    // Proxy will force re-authentication
                }
            }

            return token
        },
    },
})

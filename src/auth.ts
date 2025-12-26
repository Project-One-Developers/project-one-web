import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"
import NextAuth from "next-auth"
import Discord from "next-auth/providers/discord"

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Discord({
            authorization: {
                params: {
                    scope: "identify guilds.members.read",
                },
            },
        }),
    ],
    callbacks: {
        async signIn({ account, profile }) {
            if (!profile?.id || !account?.access_token) {
                return false
            }

            const guildId = process.env.DISCORD_GUILD_ID
            const allowedRoles = process.env.DISCORD_ALLOWED_ROLES?.split(",") ?? []

            if (!guildId || allowedRoles.length === 0) {
                logger.error(
                    "Auth",
                    "Missing DISCORD_GUILD_ID or DISCORD_ALLOWED_ROLES env variables"
                )
                return false
            }

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

                // Check if user has any of the allowed roles
                const hasAllowedRole = userRoles.some((role) =>
                    allowedRoles.includes(role)
                )

                if (!hasAllowedRole) {
                    logger.info(
                        "Auth",
                        `Access denied for ${s(profile.username)} - missing required role`
                    )
                    return false
                }

                logger.info("Auth", `Access granted for ${s(profile.username)}`)
                return true
            } catch (error) {
                logger.error("Auth", `Error checking Discord roles: ${s(error)}`)
                return false
            }
        },
        session({ session, token }) {
            session.user.id = token.sub ?? ""
            return session
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
})

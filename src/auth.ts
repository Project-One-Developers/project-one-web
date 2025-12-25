import NextAuth from 'next-auth'
import Discord from 'next-auth/providers/discord'

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Discord({
            authorization: {
                params: {
                    scope: 'identify guilds.members.read'
                }
            }
        })
    ],
    callbacks: {
        async signIn({ account, profile }) {
            if (!profile?.id || !account?.access_token) return false

            const guildId = process.env.DISCORD_GUILD_ID
            const allowedRoles = process.env.DISCORD_ALLOWED_ROLES?.split(',') || []

            if (!guildId || allowedRoles.length === 0) {
                console.error('Missing DISCORD_GUILD_ID or DISCORD_ALLOWED_ROLES env variables')
                return false
            }

            try {
                // Fetch user's membership in the guild
                const res = await fetch(
                    `https://discord.com/api/users/@me/guilds/${guildId}/member`,
                    {
                        headers: {
                            Authorization: `Bearer ${account.access_token}`
                        }
                    }
                )

                if (!res.ok) {
                    console.log(`User ${profile.username} (${profile.id}) is not in the guild`)
                    return false
                }

                const member = await res.json()
                const userRoles: string[] = member.roles || []

                // Check if user has any of the allowed roles
                const hasAllowedRole = userRoles.some(role => allowedRoles.includes(role))

                if (!hasAllowedRole) {
                    console.log(`Access denied for ${profile.username} - missing required role`)
                    return false
                }

                console.log(`Access granted for ${profile.username}`)
                return true
            } catch (error) {
                console.error('Error checking Discord roles:', error)
                return false
            }
        },
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub
            }
            return session
        }
    },
    pages: {
        signIn: '/login',
        error: '/login'
    }
})

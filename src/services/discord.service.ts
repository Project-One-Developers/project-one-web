import {
    Client,
    GatewayIntentBits,
    Message,
    TextChannel,
    type FetchMessagesOptions,
} from "discord.js"
import "server-only"
import { logger } from "@/lib/logger"
import { s } from "@/shared/libs/string-utils"

export type DiscordMessage = {
    content: string
    createdAt: Date
}

export const discordService = {
    /**
     * Read messages from a Discord channel since a cutoff date.
     * Stops fetching when messages are older than the cutoff (optimization).
     */
    readMessagesSince: async (
        discordBotToken: string,
        discordChannelId: string,
        cutoffDate: Date
    ): Promise<DiscordMessage[]> => {
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        })

        try {
            await client.login(discordBotToken)

            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Discord.js channel type
            const channel = (await client.channels.fetch(discordChannelId)) as TextChannel
            if (!channel.isTextBased()) {
                throw new Error("Channel not found or not a text channel")
            }

            const messages: Message[] = []
            let lastId: string | undefined
            let reachedCutoff = false

            while (!reachedCutoff) {
                const options: FetchMessagesOptions = { limit: 100 }
                if (lastId) {
                    options.before = lastId
                }

                const fetchedMessages = await channel.messages.fetch(options)

                if (fetchedMessages.size === 0) {
                    break
                }

                for (const msg of fetchedMessages.values()) {
                    if (msg.createdAt < cutoffDate) {
                        reachedCutoff = true
                        break
                    }
                    messages.push(msg)
                }

                lastId = fetchedMessages.last()?.id
            }

            logger.info(
                "Discord",
                `Fetched ${s(messages.length)} messages since ${s(cutoffDate)}`
            )

            await client.destroy()

            return messages.map((msg) => ({
                content: msg.content,
                createdAt: msg.createdAt,
            }))
        } catch (error) {
            logger.error("Discord", `Error syncing from Discord: ${s(error)}`)
            await client.destroy()
            return []
        }
    },

    /**
     * Read all messages from a Discord channel
     */
    readAllMessages: async (
        discordBotToken: string,
        discordChannelId: string
    ): Promise<DiscordMessage[]> => {
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        })

        try {
            await client.login(discordBotToken)

            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Discord.js channel type
            const channel = (await client.channels.fetch(discordChannelId)) as TextChannel
            if (!channel.isTextBased()) {
                throw new Error("Channel not found or not a text channel")
            }

            let messages: Message[] = []
            let lastId: string | undefined

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- intentional infinite loop with break
            while (true) {
                const options: FetchMessagesOptions = { limit: 100 }
                if (lastId) {
                    options.before = lastId
                }

                const fetchedMessages = await channel.messages.fetch(options)

                if (fetchedMessages.size === 0) {
                    break
                }

                messages = [...messages, ...fetchedMessages.values()]
                lastId = fetchedMessages.last()?.id
            }

            logger.info("Discord", `Fetched ${s(messages.length)} messages`)

            await client.destroy()

            // Transform to simpler type for serialization
            return messages.map((msg) => ({
                content: msg.content,
                createdAt: msg.createdAt,
            }))
        } catch (error) {
            logger.error("Discord", `Error syncing from Discord: ${s(error)}`)
            await client.destroy()
            return []
        }
    },

    /**
     * Extract droptimizer URLs from Discord messages
     */
    extractUrlsFromMessages: (
        messages: DiscordMessage[],
        lowerBoundDate: Date
    ): Set<string> => {
        const raidbotsUrlRegex =
            /https:\/\/www\.raidbots\.com\/simbot\/report\/([a-zA-Z0-9]+)/g
        const qeLiveUrlRegex =
            /https:\/\/questionablyepic\.com\/live\/upgradereport\/([a-zA-Z0-9-_]+)/g

        return new Set(
            messages
                .filter((msg) => msg.createdAt >= lowerBoundDate)
                .flatMap((message) => {
                    const raidbotsMatches = message.content.match(raidbotsUrlRegex) ?? []
                    const qeLiveMatches = message.content.match(qeLiveUrlRegex) ?? []
                    return [...raidbotsMatches, ...qeLiveMatches]
                })
        )
    },
}

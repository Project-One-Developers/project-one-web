import {
    Client,
    FetchMessagesOptions,
    GatewayIntentBits,
    Message,
    TextChannel,
} from "discord.js"

export interface DiscordMessage {
    content: string
    createdAt: Date
}

export async function readAllMessagesInDiscord(
    discordBotToken: string,
    discordChannelId: string
): Promise<DiscordMessage[]> {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ],
    })

    try {
        await client.login(discordBotToken)

        const channel = (await client.channels.fetch(discordChannelId)) as TextChannel
        if (!channel || !channel.isTextBased()) {
            throw new Error("Channel not found or not a text channel")
        }

        let messages: Message[] = []
        let lastId: string | undefined

        while (true) {
            const options: FetchMessagesOptions = { limit: 100 }
            if (lastId) {
                options.before = lastId
            }

            const fetchedMessages = await channel.messages.fetch(options)

            if (fetchedMessages.size === 0) break

            messages = [...messages, ...fetchedMessages.values()]
            lastId = fetchedMessages.last()?.id
        }

        console.log(`Fetched ${messages.length} messages`)

        await client.destroy()

        // Transform to simpler type for serialization
        return messages.map((msg) => ({
            content: msg.content,
            createdAt: msg.createdAt,
        }))
    } catch (error) {
        console.error("Error syncing from Discord:", error)
        await client.destroy()
        return []
    }
}

/**
 * Extract droptimizer URLs from Discord messages
 */
export function extractUrlsFromMessages(
    messages: DiscordMessage[],
    lowerBoundDate: Date
): Set<string> {
    const raidbotsUrlRegex =
        /https:\/\/www\.raidbots\.com\/simbot\/report\/([a-zA-Z0-9]+)/g
    const qeLiveUrlRegex =
        /https:\/\/questionablyepic\.com\/live\/upgradereport\/([a-zA-Z0-9-_]+)/g

    return new Set(
        messages
            .filter((msg) => msg.createdAt >= lowerBoundDate)
            .flatMap((message) => {
                const raidbotsMatches = message.content.match(raidbotsUrlRegex) || []
                const qeLiveMatches = message.content.match(qeLiveUrlRegex) || []
                return [...raidbotsMatches, ...qeLiveMatches]
            })
    )
}

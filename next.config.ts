import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    serverExternalPackages: ["discord.js", "zlib-sync", "@discordjs/ws"],
}

export default nextConfig

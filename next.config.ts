import { execSync } from "child_process"

import type { NextConfig } from "next"

const getGitSha = (): string => {
    try {
        return execSync("git rev-parse --short HEAD").toString().trim()
    } catch {
        return "unknown"
    }
}

const nextConfig: NextConfig = {
    env: {
        NEXT_PUBLIC_BUILD_ID: getGitSha(),
    },
    serverExternalPackages: ["discord.js", "zlib-sync", "@discordjs/ws"],
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "wow.zamimg.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "data.wowaudit.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "render.worldofwarcraft.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "www.raidbots.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "cdn.raiderio.net",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "assets.rpglogs.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "i.giphy.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "media1.tenor.com",
                pathname: "/**",
            },
        ],
    },
}

export default nextConfig

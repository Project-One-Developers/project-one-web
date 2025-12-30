import Image from "next/image"
import type { JSX } from "react"

export default function HomePage(): JSX.Element {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-8">
            {/* Logo */}
            <Image
                src="/logo.png"
                alt="Project One Logo"
                width={280}
                height={280}
                priority
                className="drop-shadow-2xl"
            />

            {/* Tagline */}
            <div className="mt-8 text-center space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Project One</h1>
                <p className="text-muted-foreground text-sm max-w-md">
                    Guild management and loot distribution companion
                </p>
            </div>

            {/* Subtle decorative line */}
            <div className="mt-8 w-24 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
    )
}

import Image from "next/image"
import * as React from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { cn } from "@/lib/utils"
import { encounterIcon } from "@/lib/wow-icon"

export type BossCardProps = {
    bossId: number
    bossName: string
    children: React.ReactNode
    className?: string
    contentClassName?: string
}

const BossCard = React.forwardRef<HTMLDivElement, BossCardProps>(
    ({ bossId, bossName, children, className, contentClassName }, ref) => {
        const bossImage = encounterIcon.get(bossId)

        return (
            <GlassCard
                ref={ref}
                padding="none"
                className={cn("flex flex-col overflow-hidden min-w-[300px]", className)}
            >
                {/* Boss header: cover + name */}
                <div className="flex flex-col gap-y-2">
                    {bossImage && (
                        <Image
                            src={bossImage}
                            alt={`${bossName} icon`}
                            width={300}
                            height={128}
                            className="w-full h-32 object-scale-down"
                            unoptimized
                        />
                    )}
                    <h2 className="text-center text-xs font-bold py-2">{bossName}</h2>
                </div>

                {/* Content area */}
                <div className={cn("flex flex-col gap-y-3 p-5", contentClassName)}>
                    {children}
                </div>
            </GlassCard>
        )
    }
)
BossCard.displayName = "BossCard"

export { BossCard }

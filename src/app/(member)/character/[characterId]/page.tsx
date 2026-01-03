"use client"

import { ArrowLeft, Crown, Users } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { CharGameInfoPanel } from "@/components/character-game-info-panel"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { GlassCard } from "@/components/ui/glass-card"
import { HighlightBadge } from "@/components/ui/highlight-badge"
import { IconButton } from "@/components/ui/icon-button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { WowCharacterLink } from "@/components/wow/wow-character-links"
import { WowClassIcon } from "@/components/wow/wow-class-icon"
import { useCharacterWithGameInfo } from "@/lib/queries/players"

export default function CharacterViewPage() {
    const params = useParams<{ characterId: string }>()
    const router = useRouter()
    const characterId = params.characterId

    const { data, isLoading } = useCharacterWithGameInfo(characterId)
    const character = data
    const gameInfo = data?.gameInfo

    if (isLoading) {
        return <LoadingSpinner size="lg" iconSize="lg" text="Loading character..." />
    }

    if (!character) {
        return (
            <EmptyState
                size="full"
                icon={<Users className="w-8 h-8" />}
                title="Character not found"
                description="This character may have been deleted or doesn't exist"
                action={
                    <Button
                        variant="outline"
                        onClick={() => {
                            router.back()
                        }}
                        className="rounded-xl"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
                    </Button>
                }
            />
        )
    }

    return (
        <div className="w-full h-full flex flex-col gap-4 p-6 md:p-8">
            {/* Page Header - Read-only version without action buttons */}
            <GlassCard
                padding="default"
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0"
            >
                <div className="flex items-center gap-4">
                    {/* Back Button */}
                    <IconButton
                        icon={<ArrowLeft className="h-4 w-4" />}
                        onClick={() => {
                            router.back()
                        }}
                    />

                    {/* Character Icon */}
                    <div className="relative">
                        {character.main && (
                            <div className="absolute -top-1 -right-1 z-10">
                                <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            </div>
                        )}
                        <WowClassIcon
                            wowClassName={character.class}
                            charname={character.name}
                            showTooltip={false}
                            className="h-12 w-12 border-2 border-border/50 rounded-xl"
                        />
                    </div>

                    {/* Character Info */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold leading-tight">
                                {character.name}
                            </h1>
                            {character.main && (
                                <HighlightBadge variant="main">MAIN</HighlightBadge>
                            )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {character.realm.replaceAll("-", " ")}
                        </span>
                    </div>

                    {/* Divider */}
                    <div className="hidden sm:block h-10 w-px bg-border/50 mx-2" />

                    {/* External Links */}
                    <div className="hidden sm:flex items-center gap-2">
                        <WowCharacterLink character={character} site="raiderio" />
                        <WowCharacterLink character={character} site="warcraftlogs" />
                        <WowCharacterLink character={character} site="armory" />
                    </div>
                </div>

                {/* Mobile External Links */}
                <div className="flex sm:hidden items-center gap-2">
                    <WowCharacterLink character={character} site="raiderio" />
                    <WowCharacterLink character={character} site="warcraftlogs" />
                    <WowCharacterLink character={character} site="armory" />
                </div>
            </GlassCard>

            {/* Character Game Info Panel */}
            <div className="flex-1 min-h-0">
                <CharGameInfoPanel character={character} gameInfo={gameInfo} />
            </div>
        </div>
    )
}

"use client"

import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Crown, Edit, RefreshCw, Trash2, Users } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { syncCharacterBlizzard } from "@/actions/blizzard"
import CharacterDeleteDialog from "@/components/character-delete-dialog"
import CharacterDialog from "@/components/character-dialog"
import { CharGameInfoPanel } from "@/components/character-game-info-panel"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { GlassCard } from "@/components/ui/glass-card"
import { HighlightBadge } from "@/components/ui/highlight-badge"
import { IconButton } from "@/components/ui/icon-button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { WowCharacterLink } from "@/components/wow/wow-character-links"
import { WowClassIcon } from "@/components/wow/wow-class-icon"
import { queryKeys } from "@/lib/queries/keys"
import { useCharacter, useCharacterGameInfo } from "@/lib/queries/players"
import { formatUnixTimestampForDisplay } from "@/shared/libs/date-utils"

export default function CharacterPage() {
    const params = useParams<{ characterId: string }>()
    const router = useRouter()
    const queryClient = useQueryClient()
    const characterId = params.characterId

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)

    const characterQuery = useCharacter(characterId)
    const character = characterQuery.data
    const gameInfoQuery = useCharacterGameInfo(characterId)
    const gameInfo = gameInfoQuery.data
    const syncedAt = gameInfo?.blizzard?.syncedAt

    if (characterQuery.isLoading) {
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
                            router.push("/roster")
                        }}
                        className="rounded-xl"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Roster
                    </Button>
                }
            />
        )
    }

    return (
        <div className="w-full h-full flex flex-col gap-4 p-6 md:p-8">
            {/* Page Header */}
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

                {/* Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Mobile External Links */}
                    <div className="flex sm:hidden items-center gap-2 mr-auto">
                        <WowCharacterLink character={character} site="raiderio" />
                        <WowCharacterLink character={character} site="warcraftlogs" />
                        <WowCharacterLink character={character} site="armory" />
                    </div>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="rounded-xl bg-card/50 border border-border/50 hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
                                disabled={isSyncing}
                                onClick={() => {
                                    setIsSyncing(true)
                                    syncCharacterBlizzard(
                                        character.id,
                                        character.name,
                                        character.realm
                                    )
                                        .then(() =>
                                            Promise.all([
                                                characterQuery.refetch(),
                                                gameInfoQuery.refetch(),
                                                queryClient.invalidateQueries({
                                                    queryKey: [
                                                        queryKeys.characterGameInfo,
                                                        character.id,
                                                    ],
                                                }),
                                            ])
                                        )
                                        .then(() => {
                                            toast.success("Character synced successfully")
                                        })
                                        .catch(() => {
                                            toast.error("Failed to sync character")
                                        })
                                        .finally(() => {
                                            setIsSyncing(false)
                                        })
                                }}
                            >
                                <RefreshCw
                                    className={`h-4 w-4 sm:mr-2 ${isSyncing ? "animate-spin" : ""}`}
                                />
                                <span className="hidden sm:inline">
                                    {isSyncing ? "Syncing..." : "Sync"}
                                </span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {syncedAt ? (
                                <span className="text-xs">
                                    Last synced: {formatUnixTimestampForDisplay(syncedAt)}
                                </span>
                            ) : (
                                <span className="text-xs">Never synced</span>
                            )}
                        </TooltipContent>
                    </Tooltip>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-xl bg-card/50 border border-border/50 hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
                        onClick={() => {
                            setIsEditDialogOpen(true)
                        }}
                    >
                        <Edit className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                            setIsDeleteDialogOpen(true)
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </GlassCard>

            {/* Character Game Info Panel */}
            <div className="flex-1 min-h-0">
                <CharGameInfoPanel character={character} gameInfo={gameInfo} />
            </div>

            {/* Dialogs */}
            <CharacterDialog
                isOpen={isEditDialogOpen}
                setOpen={setIsEditDialogOpen}
                mode="edit"
                player={character.player}
                existingCharacter={character}
            />
            <CharacterDeleteDialog
                isOpen={isDeleteDialogOpen}
                setOpen={setIsDeleteDialogOpen}
                character={character}
            />
        </div>
    )
}

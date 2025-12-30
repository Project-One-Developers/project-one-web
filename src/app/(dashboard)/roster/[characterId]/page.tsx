"use client"

import { ArrowLeft, Crown, Edit, LoaderCircle, Trash2, Users } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import CharacterDeleteDialog from "@/components/character-delete-dialog"
import CharacterDialog from "@/components/character-dialog"
import { CharGameInfoPanel } from "@/components/character-game-info-panel"
import { Button } from "@/components/ui/button"
import { WowCharacterLink } from "@/components/wow/wow-character-links"
import { WowClassIcon } from "@/components/wow/wow-class-icon"
import { useCharacter } from "@/lib/queries/players"

export default function CharacterPage() {
    const params = useParams<{ characterId: string }>()
    const router = useRouter()
    const characterId = params.characterId

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

    const characterQuery = useCharacter(characterId)
    const character = characterQuery.data

    if (characterQuery.isLoading) {
        return (
            <div className="flex flex-col items-center w-full justify-center min-h-[50vh]">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                    <LoaderCircle className="relative animate-spin w-12 h-12 text-primary" />
                </div>
                <p className="mt-4 text-muted-foreground text-sm">
                    Loading character...
                </p>
            </div>
        )
    }

    if (!character) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium mb-1">Character not found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    This character may have been deleted or doesn&apos;t exist
                </p>
                <Button
                    variant="outline"
                    onClick={() => {
                        router.push("/roster")
                    }}
                    className="rounded-xl"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Roster
                </Button>
            </div>
        )
    }

    return (
        <div className="w-full h-full flex flex-col gap-4 p-6 md:p-8">
            {/* Page Header */}
            <div className="bg-card/40 backdrop-blur-sm border border-border/40 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    {/* Back Button */}
                    <button
                        onClick={() => {
                            router.back()
                        }}
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-card/50 border border-border/50 hover:bg-card hover:border-primary/30 transition-all"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>

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
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                                    MAIN
                                </span>
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
            </div>

            {/* Character Game Info Panel */}
            <div className="flex-1 min-h-0">
                <CharGameInfoPanel character={character} />
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

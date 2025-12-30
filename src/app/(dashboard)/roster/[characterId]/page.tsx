"use client"

import { ArrowLeft, Edit, LoaderCircle, Trash2 } from "lucide-react"
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
            <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                <LoaderCircle className="animate-spin text-5xl" />
            </div>
        )
    }

    if (!character) {
        return (
            <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                <p className="text-muted-foreground">Character not found</p>
                <Button
                    variant="outline"
                    onClick={() => {
                        router.push("/roster")
                    }}
                    className="mt-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Roster
                </Button>
            </div>
        )
    }

    return (
        <div className="w-full h-full flex flex-col gap-y-3 p-4 relative">
            {/* Page Header */}
            <div className="bg-muted rounded-lg p-3 shadow-lg flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            router.back()
                        }}
                        className="hover:bg-gray-800 p-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <WowClassIcon
                        wowClassName={character.class}
                        charname={character.name}
                        showTooltip={false}
                        className="h-10 w-10 border-2 border-background rounded-lg"
                    />
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold leading-tight">
                            {character.name}
                        </h1>
                        <span className="text-sm text-muted-foreground">
                            {character.realm}
                        </span>
                    </div>
                    <div className="h-8 w-px bg-border mx-2" />
                    <div className="flex items-center gap-3">
                        <WowCharacterLink character={character} site="raiderio" />
                        <WowCharacterLink character={character} site="warcraftlogs" />
                        <WowCharacterLink character={character} site="armory" />
                    </div>
                </div>
                <div className="flex space-x-2">
                    <Button
                        variant="secondary"
                        className="hover:bg-blue-700"
                        onClick={() => {
                            setIsEditDialogOpen(true)
                        }}
                    >
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button
                        variant="destructive"
                        className="hover:bg-red-700"
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

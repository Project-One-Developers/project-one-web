"use client"

import { Loader2 } from "lucide-react"
import { useState, useMemo, type JSX } from "react"
import { useAddPlayer, useEditPlayer } from "@/lib/queries/players"
import type { NewPlayer, Player } from "@/shared/models/character.model"
import { Button } from "./ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

type PlayerDialogProps = {
    isOpen: boolean
    setOpen: (open: boolean) => void
    existingPlayer?: Player
}

function PlayerDialogContent({
    setOpen,
    existingPlayer,
}: Omit<PlayerDialogProps, "isOpen">): JSX.Element {
    const isEditing = existingPlayer !== undefined

    const initialName = useMemo(
        () => (existingPlayer ? existingPlayer.name : ""),
        [existingPlayer]
    )
    const [playerName, setPlayerName] = useState(initialName)
    const [nameError, setNameError] = useState("")

    const { executeAsync: addPlayer, isExecuting: isAdding } = useAddPlayer()
    const { executeAsync: editPlayer, isExecuting: isEditingPlayer } = useEditPlayer()

    const resetForm = () => {
        setPlayerName("")
        setNameError("")
    }

    const validateForm = (): boolean => {
        const trimmedName = playerName.trim()

        if (!trimmedName) {
            setNameError("Name is required")
            return false
        }

        setNameError("")
        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        const playerData: NewPlayer = {
            name: playerName.trim(),
        }

        if (existingPlayer) {
            const result = await editPlayer({ id: existingPlayer.id, ...playerData })
            if (result.data) {
                setOpen(false)
            }
        } else {
            const result = await addPlayer(playerData)
            if (result.data) {
                resetForm()
                setOpen(false)
            }
        }
    }

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPlayerName(e.target.value)
        if (nameError) {
            setNameError("")
        }
    }

    const isLoading = isAdding || isEditingPlayer

    return (
        <>
            <DialogHeader>
                <DialogTitle>{isEditing ? "Edit" : "New"} player</DialogTitle>
                <DialogDescription>
                    Enter only the player&apos;s nickname. Characters played should be
                    added later and must be named as they are in the game.
                </DialogDescription>
            </DialogHeader>

            <form
                onSubmit={(e) => void handleSubmit(e)}
                className="flex flex-col gap-y-4"
            >
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        value={playerName}
                        onChange={handleNameChange}
                        className={nameError ? "border-red-500" : ""}
                        placeholder="Enter player name"
                    />
                    {nameError && <p className="text-sm text-red-500">{nameError}</p>}
                </div>

                <Button disabled={isLoading} type="submit">
                    {isLoading ? <Loader2 className="animate-spin" /> : "Confirm"}
                </Button>
            </form>
        </>
    )
}

export default function PlayerDialog({
    isOpen,
    setOpen,
    existingPlayer,
}: PlayerDialogProps): JSX.Element {
    // Key forces content remount when dialog opens or player changes, resetting form state
    const contentKey = `${String(isOpen)}-${existingPlayer?.id ?? "new"}`

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <PlayerDialogContent
                    key={contentKey}
                    setOpen={setOpen}
                    existingPlayer={existingPlayer}
                />
            </DialogContent>
        </Dialog>
    )
}

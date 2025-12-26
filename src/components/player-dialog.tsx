"use client"

import { useAddPlayer, useEditPlayer } from "@/lib/queries/players"
import type { NewPlayer, Player } from "@/shared/types/types"
import { Loader2 } from "lucide-react"
import { useState, useMemo, type JSX } from "react"
import { toast } from "sonner"
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

    const addMutation = useAddPlayer()
    const editMutation = useEditPlayer()

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        const playerData: NewPlayer = {
            name: playerName.trim(),
        }

        if (existingPlayer) {
            editMutation.mutate(
                { id: existingPlayer.id, ...playerData },
                {
                    onSuccess: () => {
                        setOpen(false)
                        toast.success(`Player ${playerData.name} edited successfully`)
                    },
                    onError: (error) => {
                        toast.error(`Unable to edit the player. Error: ${error.message}`)
                    },
                }
            )
        } else {
            addMutation.mutate(playerData, {
                onSuccess: () => {
                    resetForm()
                    setOpen(false)
                    toast.success(
                        `The player ${playerData.name} has been successfully added.`
                    )
                },
                onError: (error) => {
                    toast.error(`Unable to add the player. Error: ${error.message}`)
                },
            })
        }
    }

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPlayerName(e.target.value)
        if (nameError) {
            setNameError("")
        }
    }

    const isLoading = addMutation.isPending || editMutation.isPending

    return (
        <>
            <DialogHeader>
                <DialogTitle>{isEditing ? "Edit" : "New"} player</DialogTitle>
                <DialogDescription>
                    Enter only the player&apos;s nickname. Characters played should be
                    added later and must be named as they are in the game.
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
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

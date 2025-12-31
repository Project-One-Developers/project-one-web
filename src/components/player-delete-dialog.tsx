"use client"

import { Loader2 } from "lucide-react"
import Image from "next/image"
import { type JSX } from "react"
import { useDeletePlayer } from "@/lib/queries/players"
import type { Player } from "@/shared/models/character.model"
import { Button } from "./ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog"

type PlayerDeleteDialogProps = {
    isOpen: boolean
    setOpen: (open: boolean) => void
    player: Player
}

export default function PlayerDeleteDialog({
    isOpen,
    setOpen,
    player,
}: PlayerDeleteDialogProps): JSX.Element {
    const { executeAsync: deletePlayer, isExecuting } = useDeletePlayer()

    const handleDelete = async () => {
        const result = await deletePlayer({ id: player.id })
        if (result.data !== undefined) {
            setOpen(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Player Deletion</DialogTitle>
                    <DialogDescription>
                        The player {player.name} and their associated characters will be
                        permanently deleted from the database.
                    </DialogDescription>
                </DialogHeader>
                <Image
                    src="https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExY2w4YzhldHo5OGtnc29raXAzN2k0YnA4am5seWdleDJlZTdwcHlmdSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/4DvP1HK8UviaOuRcCY/giphy.gif"
                    alt="Be Careful"
                    width={400}
                    height={400}
                    unoptimized
                />
                <Button disabled={isExecuting} onClick={() => void handleDelete()}>
                    {isExecuting ? <Loader2 className="animate-spin" /> : "Confirm"}
                </Button>
            </DialogContent>
        </Dialog>
    )
}

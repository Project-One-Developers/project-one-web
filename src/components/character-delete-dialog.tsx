"use client"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { type JSX } from "react"
import { toast } from "sonner"
import { useDeleteCharacter } from "@/lib/queries/players"
import type { Character } from "@/shared/models/character.model"
import { Button } from "./ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog"

type CharacterDeleteDialogProps = {
    isOpen: boolean
    setOpen: (open: boolean) => void
    character: Character
}

export default function CharacterDeleteDialog({
    isOpen,
    setOpen,
    character,
}: CharacterDeleteDialogProps): JSX.Element {
    const router = useRouter()
    const deleteMutation = useDeleteCharacter()

    const handleDelete = () => {
        deleteMutation.mutate(character.id, {
            onSuccess: () => {
                toast.success(`Character ${character.name} has been deleted.`)
                router.push("/roster")
            },
            onError: (error) => {
                toast.error(`Unable to delete the character. Error: ${error.message}`)
            },
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Character</DialogTitle>
                    <DialogDescription>
                        The character <strong>{character.name}</strong> and relative data
                        will be permanently deleted from the database
                    </DialogDescription>
                </DialogHeader>
                <Button
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={handleDelete}
                >
                    {deleteMutation.isPending ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        "Confirm"
                    )}
                </Button>
            </DialogContent>
        </Dialog>
    )
}

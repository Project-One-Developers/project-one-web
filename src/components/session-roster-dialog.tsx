"use client"

import { LoaderCircle } from "lucide-react"
import { useState, type JSX } from "react"
import { toast } from "sonner"
import { useImportRosterInRaidSession } from "@/lib/queries/raid-sessions"
import { Button } from "./ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog"
import { Textarea } from "./ui/textarea"

export default function SessionRosterImportDialog({
    isOpen,
    setOpen,
    raidSessionId,
}: {
    isOpen: boolean
    setOpen: (open: boolean) => void
    raidSessionId: string
}): JSX.Element {
    const [rosterData, setRosterData] = useState("")

    const importRosterMutation = useImportRosterInRaidSession()

    const handleImport = () => {
        importRosterMutation.mutate(
            {
                raidSessionId,
                csv: rosterData,
            },
            {
                onSuccess: () => {
                    setRosterData("")
                    setOpen(false)
                    toast.success("Roster successfully imported.")
                },
                onError: (error) => {
                    toast.error(`Failed to import Roster. ${error.message}`)
                },
            }
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import Roster</DialogTitle>
                    <DialogDescription>
                        Paste roster composition here, each row is a
                        CharacterName-ServerName or CharacterName
                    </DialogDescription>
                </DialogHeader>
                <Textarea
                    value={rosterData}
                    onChange={(e) => {
                        setRosterData(e.target.value)
                    }}
                    placeholder="Paste Roster data here..."
                    rows={20}
                    spellCheck={false}
                />
                <Button
                    className="w-full mt-4"
                    onClick={handleImport}
                    disabled={importRosterMutation.isPending || !rosterData.trim()}
                >
                    {importRosterMutation.isPending && (
                        <LoaderCircle className="animate-spin mr-2 h-4 w-4" />
                    )}
                    Import Roster
                </Button>
            </DialogContent>
        </Dialog>
    )
}

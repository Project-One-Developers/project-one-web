"use client"

import { Loader2 } from "lucide-react"
import { useState, useMemo, type JSX } from "react"
import { toast } from "sonner"
import {
    useAddSpreadsheetLink,
    useEditSpreadsheetLink,
} from "@/lib/queries/spreadsheet-links"
import type {
    NewSpreadsheetLink,
    SpreadsheetLink,
} from "@/shared/models/spreadsheet-link.models"
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

type SpreadsheetLinkDialogProps = {
    isOpen: boolean
    setOpen: (open: boolean) => void
    existingLink?: SpreadsheetLink
    onSuccess?: () => void
}

function SpreadsheetLinkDialogContent({
    setOpen,
    existingLink,
    onSuccess,
}: Omit<SpreadsheetLinkDialogProps, "isOpen">): JSX.Element {
    const isEditing = existingLink !== undefined

    const initialTitle = useMemo(() => existingLink?.title ?? "", [existingLink])
    const initialUrl = useMemo(() => existingLink?.url ?? "", [existingLink])

    const [title, setTitle] = useState(initialTitle)
    const [url, setUrl] = useState(initialUrl)
    const [titleError, setTitleError] = useState("")
    const [urlError, setUrlError] = useState("")

    const addMutation = useAddSpreadsheetLink()
    const editMutation = useEditSpreadsheetLink()

    const resetForm = () => {
        setTitle("")
        setUrl("")
        setTitleError("")
        setUrlError("")
    }

    const validateForm = (): boolean => {
        let valid = true

        if (!title.trim()) {
            setTitleError("Title is required")
            valid = false
        } else if (title.length > 100) {
            setTitleError("Title too long (max 100 characters)")
            valid = false
        } else {
            setTitleError("")
        }

        try {
            new URL(url)
            setUrlError("")
        } catch {
            setUrlError("Must be a valid URL")
            valid = false
        }

        return valid
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        const linkData: NewSpreadsheetLink = {
            title: title.trim(),
            url: url.trim(),
        }

        if (existingLink) {
            editMutation.mutate(
                { id: existingLink.id, ...linkData },
                {
                    onSuccess: () => {
                        setOpen(false)
                        toast.success(`"${linkData.title}" updated`)
                        onSuccess?.()
                    },
                    onError: (error) => {
                        toast.error(`Failed to update: ${error.message}`)
                    },
                }
            )
        } else {
            addMutation.mutate(linkData, {
                onSuccess: () => {
                    resetForm()
                    setOpen(false)
                    toast.success(`"${linkData.title}" added`)
                    onSuccess?.()
                },
                onError: (error) => {
                    toast.error(`Failed to add: ${error.message}`)
                },
            })
        }
    }

    const isLoading = addMutation.isPending || editMutation.isPending

    return (
        <>
            <DialogHeader>
                <DialogTitle>{isEditing ? "Edit" : "Add"} Spreadsheet Link</DialogTitle>
                <DialogDescription>
                    Add external spreadsheet links that will appear in the sidebar for
                    officers.
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
                <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                        id="title"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value)
                            if (titleError) {
                                setTitleError("")
                            }
                        }}
                        className={titleError ? "border-red-500" : ""}
                        placeholder="e.g., Split Sheet"
                    />
                    {titleError && <p className="text-sm text-red-500">{titleError}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <Input
                        id="url"
                        value={url}
                        onChange={(e) => {
                            setUrl(e.target.value)
                            if (urlError) {
                                setUrlError("")
                            }
                        }}
                        className={urlError ? "border-red-500" : ""}
                        placeholder="https://docs.google.com/spreadsheets/..."
                    />
                    {urlError && <p className="text-sm text-red-500">{urlError}</p>}
                </div>

                <Button disabled={isLoading} type="submit">
                    {isLoading ? <Loader2 className="animate-spin" /> : "Confirm"}
                </Button>
            </form>
        </>
    )
}

export default function SpreadsheetLinkDialog({
    isOpen,
    setOpen,
    existingLink,
    onSuccess,
}: SpreadsheetLinkDialogProps): JSX.Element {
    const contentKey = `${String(isOpen)}-${existingLink?.id ?? "new"}`

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-106.25">
                <SpreadsheetLinkDialogContent
                    key={contentKey}
                    setOpen={setOpen}
                    existingLink={existingLink}
                    onSuccess={onSuccess}
                />
            </DialogContent>
        </Dialog>
    )
}

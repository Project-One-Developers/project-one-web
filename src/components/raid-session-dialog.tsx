"use client"

import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { useState, type JSX, useMemo } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { useCharacters } from "@/lib/queries/players"
import { useAddRaidSession, useEditRaidSession } from "@/lib/queries/raid-sessions"
import { defined } from "@/lib/utils"
import { getUnixTimestamp } from "@/shared/libs/date/date-utils"
import type {
    Character,
    EditRaidSession,
    NewRaidSession,
    RaidSessionWithRoster,
} from "@/shared/types/types"

import { Button } from "./ui/button"
import { Checkbox } from "./ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

type RaidSessionDialogProps = {
    isOpen: boolean
    setOpen: (open: boolean) => void
    existingSession?: RaidSessionWithRoster
}

function RaidSessionDialogContent({
    setOpen,
    existingSession,
}: Pick<RaidSessionDialogProps, "setOpen" | "existingSession">): JSX.Element {
    const { data: characters } = useCharacters()
    const isEditMode = defined(existingSession)

    // Group characters by main/alt status
    const { mains, alts } = useMemo(() => {
        if (!characters) {
            return { mains: [], alts: [] }
        }
        const mainChars = characters.filter((c) => c.main)
        const altChars = characters.filter((c) => !c.main)
        return { mains: mainChars, alts: altChars }
    }, [characters])

    // Initialize with existing session roster or all mains selected
    const initialSelectedCharacters = useMemo(() => {
        if (existingSession) {
            return new Set(existingSession.roster.map((c) => c.id))
        }
        return new Set(mains.map((c) => c.id))
    }, [existingSession, mains])

    const [sessionName, setSessionName] = useState(existingSession?.name ?? "")
    const [nameError, setNameError] = useState("")
    const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(
        initialSelectedCharacters
    )

    const addMutation = useAddRaidSession()
    const editMutation = useEditRaidSession()

    const resetForm = () => {
        setSessionName("")
        setNameError("")
        setSelectedCharacters(new Set())
    }

    const validateForm = (): boolean => {
        const trimmedName = sessionName.trim()

        if (!trimmedName) {
            setNameError("Session name is required")
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

        if (existingSession) {
            const sessionData: EditRaidSession = {
                id: existingSession.id,
                name: sessionName.trim(),
                raidDate: existingSession.raidDate,
                roster: Array.from(selectedCharacters),
            }

            editMutation.mutate(sessionData, {
                onSuccess: () => {
                    setOpen(false)
                    toast.success(
                        `Raid session "${sessionData.name}" updated successfully`
                    )
                },
                onError: (error) => {
                    toast.error(`Unable to update raid session. Error: ${error.message}`)
                },
            })
        } else {
            const sessionData: NewRaidSession = {
                name: sessionName.trim(),
                raidDate: getUnixTimestamp(),
                roster: Array.from(selectedCharacters),
            }

            addMutation.mutate(sessionData, {
                onSuccess: () => {
                    resetForm()
                    setOpen(false)
                    toast.success(
                        `Raid session "${sessionData.name}" created successfully`
                    )
                },
                onError: (error) => {
                    toast.error(`Unable to create raid session. Error: ${error.message}`)
                },
            })
        }
    }

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSessionName(e.target.value)
        if (nameError) {
            setNameError("")
        }
    }

    const toggleCharacter = (charId: string) => {
        setSelectedCharacters((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(charId)) {
                newSet.delete(charId)
            } else {
                newSet.add(charId)
            }
            return newSet
        })
    }

    const selectAllMains = () => {
        setSelectedCharacters(new Set(mains.map((c) => c.id)))
    }

    const selectNone = () => {
        setSelectedCharacters(new Set())
    }

    const isLoading = addMutation.isPending || editMutation.isPending

    return (
        <>
            <DialogHeader>
                <DialogTitle>
                    {isEditMode ? "Edit Raid Session" : "New Raid Session"}
                </DialogTitle>
                <DialogDescription>
                    {isEditMode
                        ? "Update the raid session name and roster."
                        : "Create a new raid session and select the characters that will participate."}
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Session Name</Label>
                    <Input
                        id="name"
                        value={sessionName}
                        onChange={handleNameChange}
                        className={nameError ? "border-red-500" : ""}
                        placeholder="e.g., Mythic Progression - Week 15"
                    />
                    {nameError && <p className="text-sm text-red-500">{nameError}</p>}
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label>Roster ({selectedCharacters.size} selected)</Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={selectAllMains}
                            >
                                Select Mains
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={selectNone}
                            >
                                Clear
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="h-[250px] border rounded-md p-3">
                        {mains.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                                    Mains
                                </h4>
                                <div className="space-y-2">
                                    {mains.map((char) => (
                                        <CharacterCheckbox
                                            key={char.id}
                                            character={char}
                                            checked={selectedCharacters.has(char.id)}
                                            onToggle={() => {
                                                toggleCharacter(char.id)
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {alts.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                                    Alts
                                </h4>
                                <div className="space-y-2">
                                    {alts.map((char) => (
                                        <CharacterCheckbox
                                            key={char.id}
                                            character={char}
                                            checked={selectedCharacters.has(char.id)}
                                            onToggle={() => {
                                                toggleCharacter(char.id)
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {mains.length === 0 && alts.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No characters found. Add characters in the Roster page
                                first.
                            </p>
                        )}
                    </ScrollArea>
                </div>

                <Button disabled={isLoading} type="submit">
                    {isLoading ? (
                        <Loader2 className="animate-spin" />
                    ) : isEditMode ? (
                        "Update Session"
                    ) : (
                        "Create Session"
                    )}
                </Button>
            </form>
        </>
    )
}

export default function RaidSessionDialog({
    isOpen,
    setOpen,
    existingSession,
}: RaidSessionDialogProps): JSX.Element {
    // Key forces content remount when dialog opens, resetting form state
    const contentKey = `session-dialog-${String(isOpen)}-${existingSession?.id ?? "new"}`

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <RaidSessionDialogContent
                    key={contentKey}
                    setOpen={setOpen}
                    existingSession={existingSession}
                />
            </DialogContent>
        </Dialog>
    )
}

function CharacterCheckbox({
    character,
    checked,
    onToggle,
}: {
    character: Character
    checked: boolean
    onToggle: () => void
}) {
    return (
        <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
            <Checkbox checked={checked} onCheckedChange={onToggle} />
            <span className="text-sm">
                {character.name}
                <span className="text-muted-foreground ml-1">({character.class})</span>
            </span>
        </label>
    )
}

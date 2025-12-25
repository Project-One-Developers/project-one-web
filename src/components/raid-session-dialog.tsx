'use client'

import { useAddRaidSession } from '@/lib/queries/raid-sessions'
import { useCharacters } from '@/lib/queries/players'
import { getUnixTimestamp } from '@/shared/libs/date/date-utils'
import type { Character, NewRaidSession } from '@/shared/types/types'
import { Loader2 } from 'lucide-react'
import { useState, useEffect, type JSX, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'

type RaidSessionDialogProps = {
    isOpen: boolean
    setOpen: (open: boolean) => void
}

export default function RaidSessionDialog({
    isOpen,
    setOpen
}: RaidSessionDialogProps): JSX.Element {
    const [sessionName, setSessionName] = useState('')
    const [nameError, setNameError] = useState('')
    const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set())

    const addMutation = useAddRaidSession()
    const { data: characters } = useCharacters()

    // Group characters by main/alt status
    const { mains, alts } = useMemo(() => {
        if (!characters) return { mains: [], alts: [] }
        const mainChars = characters.filter(c => c.main)
        const altChars = characters.filter(c => !c.main)
        return { mains: mainChars, alts: altChars }
    }, [characters])

    useEffect(() => {
        if (isOpen) {
            // Reset form when opening
            setSessionName('')
            setNameError('')
            // Pre-select all mains by default
            if (mains.length > 0) {
                setSelectedCharacters(new Set(mains.map(c => c.id)))
            }
        }
    }, [isOpen, mains])

    const resetForm = () => {
        setSessionName('')
        setNameError('')
        setSelectedCharacters(new Set())
    }

    const validateForm = (): boolean => {
        const trimmedName = sessionName.trim()

        if (!trimmedName) {
            setNameError('Session name is required')
            return false
        }

        setNameError('')
        return true
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        const sessionData: NewRaidSession = {
            name: sessionName.trim(),
            raidDate: getUnixTimestamp(),
            roster: Array.from(selectedCharacters)
        }

        addMutation.mutate(sessionData, {
            onSuccess: () => {
                resetForm()
                setOpen(false)
                toast.success(`Raid session "${sessionData.name}" created successfully`)
            },
            onError: error => {
                toast.error(`Unable to create raid session. Error: ${error.message}`)
            }
        })
    }

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSessionName(e.target.value)
        if (nameError) {
            setNameError('')
        }
    }

    const toggleCharacter = (charId: string) => {
        setSelectedCharacters(prev => {
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
        setSelectedCharacters(new Set(mains.map(c => c.id)))
    }

    const selectNone = () => {
        setSelectedCharacters(new Set())
    }

    const isLoading = addMutation.isPending

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>New Raid Session</DialogTitle>
                    <DialogDescription>
                        Create a new raid session and select the characters that will participate.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Session Name</Label>
                        <Input
                            id="name"
                            value={sessionName}
                            onChange={handleNameChange}
                            className={nameError ? 'border-red-500' : ''}
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
                                        {mains.map(char => (
                                            <CharacterCheckbox
                                                key={char.id}
                                                character={char}
                                                checked={selectedCharacters.has(char.id)}
                                                onToggle={() => toggleCharacter(char.id)}
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
                                        {alts.map(char => (
                                            <CharacterCheckbox
                                                key={char.id}
                                                character={char}
                                                checked={selectedCharacters.has(char.id)}
                                                onToggle={() => toggleCharacter(char.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {mains.length === 0 && alts.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No characters found. Add characters in the Roster page first.
                                </p>
                            )}
                        </ScrollArea>
                    </div>

                    <Button disabled={isLoading} type="submit">
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Create Session'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function CharacterCheckbox({
    character,
    checked,
    onToggle
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

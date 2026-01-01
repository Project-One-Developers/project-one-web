"use client"

import {
    Ban,
    Brain,
    Dumbbell,
    Loader2,
    Radiation,
    ShieldCheck,
    Swords,
    Users,
} from "lucide-react"
import { useState, type JSX, useMemo } from "react"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { usePlayersWithCharacters } from "@/lib/queries/players"
import { useAddRaidSession, useEditRaidSession } from "@/lib/queries/raid-sessions"
import { cn, defined } from "@/lib/utils"
import {
    formatUnixTimestampForDisplay,
    parseStringToUnixTimestamp,
} from "@/shared/libs/date-utils"
import type { PlayerWithCharacters } from "@/shared/models/character.models"
import type {
    EditRaidSession,
    NewRaidSession,
    RaidSessionWithRoster,
} from "@/shared/models/raid-session.models"
import type { WowClassName } from "@/shared/models/wow.models"
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
import { WowClassIcon } from "./wow/wow-class-icon"

type RaidSessionDialogProps = {
    isOpen: boolean
    setOpen: (open: boolean) => void
    existingSession?: RaidSessionWithRoster
}

// Helper functions for raid analysis
const hasClass = (
    roster: string[],
    className: WowClassName,
    players: PlayerWithCharacters[]
): boolean => {
    return roster.some((charId) => {
        const character = players
            .flatMap((p) => p.characters)
            .find((c) => c.id === charId)
        return character?.class === className
    })
}

const calculateImmunities = (
    roster: string[],
    players: PlayerWithCharacters[]
): { name: string; count: number }[] => {
    const classImmunities: Partial<Record<WowClassName, string[]>> = {
        Hunter: ["Aspect of the Turtle"],
        Mage: ["Ice Block"],
        Paladin: ["Divine Shield"],
        Rogue: ["Cloak of Shadows"],
    }

    const immunityCounts: Record<string, number> = {}

    roster.forEach((charId) => {
        const character = players
            .flatMap((p) => p.characters)
            .find((c) => c.id === charId)
        const immunities = character?.class ? classImmunities[character.class] : undefined
        if (immunities) {
            immunities.forEach((immunity) => {
                immunityCounts[immunity] = (immunityCounts[immunity] || 0) + 1
            })
        }
    })

    return Object.entries(immunityCounts).map(([name, count]) => ({ name, count }))
}

// Raid overview component
function RaidOverview({
    roster,
    players,
}: {
    roster: string[]
    players: PlayerWithCharacters[]
}) {
    const buffs: { label: string; icon: JSX.Element; class: WowClassName }[] = [
        {
            label: "Attack Power",
            icon: <Dumbbell className="w-4 h-4" />,
            class: "Warrior",
        },
        { label: "Stamina", icon: <ShieldCheck className="w-4 h-4" />, class: "Priest" },
        { label: "Intellect", icon: <Brain className="w-4 h-4" />, class: "Mage" },
        {
            label: "Chaos Brand",
            icon: <Radiation className="w-4 h-4" />,
            class: "Demon Hunter",
        },
        { label: "Mystic Touch", icon: <Swords className="w-4 h-4" />, class: "Monk" },
    ]

    const immunities = calculateImmunities(roster, players)

    return (
        <div className="p-4 rounded-lg bg-background/50">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-blue-400" /> {roster.length} Players
            </h3>
            <div className="flex flex-col space-y-1">
                {buffs.map(({ label, icon, class: className }) => {
                    const hasBuff = hasClass(roster, className, players)
                    return (
                        <div
                            key={label}
                            className={cn(
                                "flex items-center gap-2 text-sm",
                                hasBuff ? "text-foreground" : "text-muted-foreground/50"
                            )}
                        >
                            {icon} {label}
                        </div>
                    )
                })}
            </div>
            <div className="mt-4">
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-1">
                    <Ban className="w-4 h-4 text-red-500" /> Immunities
                </h4>
                {immunities.length > 0 ? (
                    <ul className="text-sm text-muted-foreground space-y-0.5">
                        {immunities.map(({ name, count }) => (
                            <li key={name}>
                                {name}{" "}
                                <span className="text-muted-foreground/70">
                                    ({count})
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground/50">None</p>
                )}
            </div>
        </div>
    )
}

// Player row with character icons
function PlayerWithCharsRow({
    player,
    selectedCharacters,
    onCharacterToggle,
}: {
    player: PlayerWithCharacters
    selectedCharacters: Set<string>
    onCharacterToggle: (player: PlayerWithCharacters, charId: string) => void
}) {
    const noneSelected = player.characters.every(
        (char) => !selectedCharacters.has(char.id)
    )

    return (
        <div className="flex items-center justify-between py-1">
            <span
                className={cn(
                    "text-sm font-medium",
                    noneSelected ? "text-muted-foreground" : "text-foreground"
                )}
            >
                {player.name}
            </span>
            <div className="flex gap-x-1">
                {player.characters.map((char) => (
                    <div
                        key={char.id}
                        onClick={() => {
                            onCharacterToggle(player, char.id)
                        }}
                        className="cursor-pointer"
                    >
                        <WowClassIcon
                            wowClassName={char.class}
                            size={20}
                            className={cn(
                                "rounded transition-all duration-200",
                                selectedCharacters.has(char.id)
                                    ? "scale-110 ring-2 ring-blue-500"
                                    : "opacity-50 grayscale hover:opacity-100"
                            )}
                        />
                        {char.main && (
                            <div className="h-0.5 w-5 bg-foreground rounded-lg mt-1" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

function RaidSessionDialogContent({
    setOpen,
    existingSession,
}: Pick<RaidSessionDialogProps, "setOpen" | "existingSession">): JSX.Element {
    const { data: players = [] } = usePlayersWithCharacters()
    const isEditMode = defined(existingSession)

    // Group players by role
    const { tankPlayers, healerPlayers, dpsPlayers } = useMemo(() => {
        return {
            tankPlayers: players.filter(
                (p) =>
                    p.characters.length > 0 && p.characters.some((c) => c.role === "Tank")
            ),
            healerPlayers: players.filter(
                (p) =>
                    p.characters.length > 0 &&
                    p.characters.some((c) => c.role === "Healer")
            ),
            dpsPlayers: players.filter(
                (p) =>
                    p.characters.length > 0 && p.characters.some((c) => c.role === "DPS")
            ),
        }
    }, [players])

    // Initialize form state
    const getDefaultDate = () => {
        const date = new Date()
        date.setHours(21, 0, 0, 0)
        return formatUnixTimestampForDisplay(Math.floor(date.getTime() / 1000))
    }

    const [sessionName, setSessionName] = useState(existingSession?.name ?? "")
    const [raidDate, setRaidDate] = useState(
        existingSession
            ? formatUnixTimestampForDisplay(existingSession.raidDate)
            : getDefaultDate()
    )
    const [nameError, setNameError] = useState("")
    const [dateError, setDateError] = useState("")
    const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(
        () => new Set(existingSession?.roster.map((c) => c.id) ?? [])
    )

    const addMutation = useAddRaidSession()
    const editMutation = useEditRaidSession()

    const validateForm = (): boolean => {
        let isValid = true

        if (!sessionName.trim()) {
            setNameError("Session name is required")
            isValid = false
        } else {
            setNameError("")
        }

        const dateRegex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/
        if (!raidDate.trim()) {
            setDateError("Raid date is required")
            isValid = false
        } else if (!dateRegex.test(raidDate)) {
            setDateError("Invalid format. Use DD/MM/YYYY HH:mm")
            isValid = false
        } else {
            setDateError("")
        }

        return isValid
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
                raidDate: parseStringToUnixTimestamp(raidDate),
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
                raidDate: parseStringToUnixTimestamp(raidDate),
                roster: Array.from(selectedCharacters),
            }

            addMutation.mutate(sessionData, {
                onSuccess: () => {
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

    // Smart toggle: only one character per player can be selected
    const handleCharacterToggle = (player: PlayerWithCharacters, charId: string) => {
        setSelectedCharacters((prev) => {
            const newSet = new Set(prev)
            const playerCharIds = new Set(player.characters.map((c) => c.id))

            if (newSet.has(charId)) {
                // Deselect the character
                newSet.delete(charId)
            } else {
                // Deselect any other character from the same player
                playerCharIds.forEach((id) => newSet.delete(id))
                // Select this character
                newSet.add(charId)
            }
            return newSet
        })
    }

    const isLoading = addMutation.isPending || editMutation.isPending

    return (
        <>
            <DialogHeader>
                <DialogTitle>
                    {isEditMode ? "Edit Raid Session" : "Create Raid Session"}
                </DialogTitle>
                <DialogDescription>
                    {isEditMode
                        ? "Update the raid session details and roster."
                        : "Create a new raid session with date and roster."}
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
                {/* Name and Date row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Session Name</Label>
                        <Input
                            id="name"
                            value={sessionName}
                            onChange={(e) => {
                                setSessionName(e.target.value)
                                if (nameError) {
                                    setNameError("")
                                }
                            }}
                            className={nameError ? "border-red-500" : ""}
                            placeholder="e.g., Mythic Progression - Week 15"
                        />
                        {nameError && <p className="text-sm text-red-500">{nameError}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Raid Date</Label>
                        <Input
                            id="date"
                            value={raidDate}
                            onChange={(e) => {
                                setRaidDate(e.target.value)
                                if (dateError) {
                                    setDateError("")
                                }
                            }}
                            className={dateError ? "border-red-500" : ""}
                            placeholder="DD/MM/YYYY HH:mm"
                        />
                        {dateError && <p className="text-sm text-red-500">{dateError}</p>}
                    </div>
                </div>

                {/* Roster selection with overview */}
                <div className="space-y-2">
                    <Label>Roster Selection</Label>
                    <div className="grid grid-cols-4 gap-4">
                        {/* Tank + Healers column */}
                        <ScrollArea className="h-75 border rounded-md p-3">
                            <div className="space-y-1">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                    Tanks
                                </h4>
                                {tankPlayers.map((player) => (
                                    <PlayerWithCharsRow
                                        key={player.id}
                                        player={player}
                                        selectedCharacters={selectedCharacters}
                                        onCharacterToggle={handleCharacterToggle}
                                    />
                                ))}
                                <hr className="my-3 border-muted" />
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                    Healers
                                </h4>
                                {healerPlayers
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map((player) => (
                                        <PlayerWithCharsRow
                                            key={player.id}
                                            player={player}
                                            selectedCharacters={selectedCharacters}
                                            onCharacterToggle={handleCharacterToggle}
                                        />
                                    ))}
                            </div>
                        </ScrollArea>

                        {/* DPS columns (2 columns) */}
                        <ScrollArea className="h-75 border rounded-md p-3 col-span-2">
                            <div className="grid grid-cols-2 gap-4">
                                {(() => {
                                    const sortedDps = [...dpsPlayers].sort((a, b) =>
                                        a.name.localeCompare(b.name)
                                    )
                                    const midpoint = Math.ceil(sortedDps.length / 2)
                                    const leftColumn = sortedDps.slice(0, midpoint)
                                    const rightColumn = sortedDps.slice(midpoint)

                                    return (
                                        <>
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                                    DPS
                                                </h4>
                                                {leftColumn.map((player) => (
                                                    <PlayerWithCharsRow
                                                        key={player.id}
                                                        player={player}
                                                        selectedCharacters={
                                                            selectedCharacters
                                                        }
                                                        onCharacterToggle={
                                                            handleCharacterToggle
                                                        }
                                                    />
                                                ))}
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 opacity-0">
                                                    DPS
                                                </h4>
                                                {rightColumn.map((player) => (
                                                    <PlayerWithCharsRow
                                                        key={player.id}
                                                        player={player}
                                                        selectedCharacters={
                                                            selectedCharacters
                                                        }
                                                        onCharacterToggle={
                                                            handleCharacterToggle
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>
                        </ScrollArea>

                        {/* Raid Overview */}
                        <RaidOverview
                            roster={Array.from(selectedCharacters)}
                            players={players}
                        />
                    </div>
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
            <DialogContent className="sm:max-w-225">
                <RaidSessionDialogContent
                    key={contentKey}
                    setOpen={setOpen}
                    existingSession={existingSession}
                />
            </DialogContent>
        </Dialog>
    )
}

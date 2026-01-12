"use client"

import { Check, Crown, Edit2, PlusIcon, Trash2, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, type JSX } from "react"
import { toast } from "sonner"
import { useEditCharacter } from "@/lib/queries/players"
import { cn } from "@/lib/utils"
import { classIcon } from "@/lib/wow-icon"
import { s } from "@/shared/libs/string-utils"
import type { PlayerWithSummaryCompact } from "@/shared/types"
import { ROLES } from "@/shared/wow.consts"
import { Button } from "./ui/button"
import { GlassCard } from "./ui/glass-card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select"
import { Slider } from "./ui/slider"

type RosterTableViewProps = {
    players: PlayerWithSummaryCompact[]
    isLowItemLevel: (itemLevel: string) => boolean
    onDeletePlayer: (player: PlayerWithSummaryCompact) => void
    onNewCharClick: (player: PlayerWithSummaryCompact) => void
}

export default function RosterTableView({
    players,
    isLowItemLevel,
    onDeletePlayer,
    onNewCharClick,
}: RosterTableViewProps): JSX.Element {
    const [editingCharId, setEditingCharId] = useState<string | null>(null)
    const [editRole, setEditRole] = useState<string>("")
    const [editMain, setEditMain] = useState(false)
    const [editPriority, setEditPriority] = useState(2)

    const editMutation = useEditCharacter()

    const handleEditClick = (
        charId: string,
        role: string,
        main: boolean,
        priority: number
    ) => {
        setEditingCharId(charId)
        setEditRole(role)
        setEditMain(main)
        // Clamp priority to 1-3 range
        setEditPriority(Math.min(Math.max(priority, 1), 3))
    }

    const handleSave = (charId: string, charName: string, charRealm: string) => {
        // Validate role
        if (editRole !== "Tank" && editRole !== "Healer" && editRole !== "DPS") {
            toast.error("Invalid role selected")
            return
        }

        editMutation.mutate(
            {
                id: charId,
                data: {
                    name: charName,
                    realm: charRealm,
                    role: editRole,
                    main: editMain,
                    priority: editPriority,
                },
            },
            {
                onSuccess: () => {
                    toast.success("Character updated")
                    setEditingCharId(null)
                },
                onError: (error: Error) => {
                    toast.error(`Failed to update: ${error.message}`)
                },
            }
        )
    }

    const handleCancel = () => {
        setEditingCharId(null)
    }

    return (
        <div className="flex flex-col gap-4">
            {players.map((player) => (
                <GlassCard key={player.id} padding="none" className="overflow-hidden">
                    {/* Player Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
                        <h2 className="font-bold text-lg">{player.name}</h2>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/20 hover:text-primary"
                                onClick={() => {
                                    onNewCharClick(player)
                                }}
                            >
                                <PlusIcon className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
                                onClick={() => {
                                    onDeletePlayer(player)
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Characters Table */}
                    {player.charsSummary.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed">
                                <colgroup><col className="w-[25%]" /><col className="w-[20%]" /><col className="w-[15%]" /><col className="w-[10%]" /><col className="w-[15%]" /><col className="w-[15%]" /></colgroup>
                                <thead>
                                    <tr className="border-b border-border/40 bg-muted/20">
                                        <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Character
                                        </th>
                                        <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Class
                                        </th>
                                        <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Role
                                        </th>
                                        <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            iLvl
                                        </th>
                                        <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Priority
                                        </th>
                                        <th className="text-right px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {player.charsSummary.map((charSummary) => {
                                        const char = charSummary.character
                                        const isEditing = editingCharId === char.id
                                        const isLowGear = isLowItemLevel(
                                            charSummary.itemLevel
                                        )

                                        return (
                                            <tr
                                                key={char.id}
                                                className="border-b border-border/40 hover:bg-muted/10 transition-colors"
                                            >
                                                {/* Character Name + Main Icon */}
                                                <td className="px-6 py-4">
                                                    <Link
                                                        href={`/roster/${char.id}`}
                                                        className="flex items-center gap-2 hover:underline"
                                                    >
                                                        <span className="font-medium">
                                                            {char.name}
                                                        </span>
                                                        {char.main && (
                                                            <Crown className="w-4 h-4 text-amber-400" />
                                                        )}
                                                    </Link>
                                                </td>

                                                {/* Class with Icon */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Image
                                                            src={
                                                                classIcon.get(
                                                                    char.class
                                                                ) ?? ""
                                                            }
                                                            alt={char.class}
                                                            width={24}
                                                            height={24}
                                                            className="rounded"
                                                        />
                                                        <span className="text-sm">
                                                            {char.class}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Role (Editable) */}
                                                <td className="px-6 py-4">
                                                    {isEditing ? (
                                                        <Select
                                                            value={editRole}
                                                            onValueChange={setEditRole}
                                                        >
                                                            <SelectTrigger
                                                                size="sm"
                                                                className="w-24"
                                                            >
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {ROLES.map((role) => (
                                                                    <SelectItem
                                                                        key={role}
                                                                        value={role}
                                                                    >
                                                                        {role}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <span
                                                            className={cn(
                                                                "text-sm",
                                                                char.role === "Tank" &&
                                                                    "text-blue-400",
                                                                char.role === "Healer" &&
                                                                    "text-green-400",
                                                                char.role === "DPS" &&
                                                                    "text-red-400"
                                                            )}
                                                        >
                                                            {char.role}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Item Level */}
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={cn(
                                                            "text-sm font-medium",
                                                            isLowGear && "text-orange-400"
                                                        )}
                                                    >
                                                        {charSummary.itemLevel}
                                                    </span>
                                                </td>

                                                {/* Priority (Editable) */}
                                                <td className="px-6 py-4">
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-3">
                                                            <Slider
                                                                min={1}
                                                                max={3}
                                                                step={1}
                                                                value={[editPriority]}
                                                                onValueChange={(
                                                                    values
                                                                ) => {
                                                                    setEditPriority(
                                                                        values[0] ?? 2
                                                                    )
                                                                }}
                                                                className="w-20"
                                                            />
                                                            <span className="text-sm font-medium w-4 text-center">
                                                                {s(editPriority)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm">
                                                            {s(char.priority)}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                {/* Main Toggle */}
                                                                <Button
                                                                    variant={
                                                                        editMain
                                                                            ? "default"
                                                                            : "outline"
                                                                    }
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setEditMain(
                                                                            !editMain
                                                                        )
                                                                    }}
                                                                    className="gap-1"
                                                                >
                                                                    <Crown className="w-3 h-3" />
                                                                    Main
                                                                </Button>

                                                                {/* Save Button */}
                                                                <Button
                                                                    variant="default"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={() => {
                                                                        handleSave(
                                                                            char.id,
                                                                            char.name,
                                                                            char.realm
                                                                        )
                                                                    }}
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                </Button>

                                                                {/* Cancel Button */}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
                                                                    onClick={handleCancel}
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => {
                                                                    handleEditClick(
                                                                        char.id,
                                                                        char.role,
                                                                        char.main,
                                                                        char.priority ?? 2
                                                                    )
                                                                }}
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="px-6 py-8 text-center text-muted-foreground">
                            No characters
                        </div>
                    )}
                </GlassCard>
            ))}
        </div>
    )
}

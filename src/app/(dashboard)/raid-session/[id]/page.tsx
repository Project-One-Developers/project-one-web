"use client"

import Image from "next/image"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import RaidSessionDialog from "@/components/raid-session-dialog"
import SessionRosterImportDialog from "@/components/session-roster-dialog"
import SessionLootNewDialog from "@/components/session-loot-new-dialog"
import { WowClassIcon } from "@/components/wow/wow-class-icon"
import {
    useCloneRaidSession,
    useDeleteRaidSession,
    useRaidSession,
} from "@/lib/queries/raid-sessions"
import { useLootsBySessionWithAssigned } from "@/lib/queries/loots"
import { formaUnixTimestampToItalianDate } from "@/shared/libs/date/date-utils"
import {
    ArrowLeft,
    Calendar,
    Copy,
    Edit,
    LoaderCircle,
    LucideMedal,
    PlusIcon,
    ShoppingBag,
    Trash2,
    Users,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

export default function RaidSessionPage() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const raidSessionId = params.id

    // Dialog states
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isImportRosterDialogOpen, setIsImportRosterDialogOpen] = useState(false)
    const [isAddLootDialogOpen, setIsAddLootDialogOpen] = useState(false)

    const { data: raidSession, isLoading } = useRaidSession(raidSessionId)
    const { data: loots } = useLootsBySessionWithAssigned(raidSessionId)
    const cloneMutation = useCloneRaidSession()
    const deleteMutation = useDeleteRaidSession()

    if (isLoading) {
        return (
            <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                <LoaderCircle className="animate-spin text-5xl" />
            </div>
        )
    }

    if (!raidSession) {
        return (
            <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                <p className="text-muted-foreground">Raid session not found</p>
                <Button
                    variant="outline"
                    onClick={() => {
                        router.push("/raid-session")
                    }}
                    className="mt-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sessions
                </Button>
            </div>
        )
    }

    const tanks = raidSession.roster
        .filter((character) => character.role === "Tank")
        .sort((a, b) => a.class.localeCompare(b.class))

    const healers = raidSession.roster
        .filter((character) => character.role === "Healer")
        .sort((a, b) => a.class.localeCompare(b.class))

    const dps = raidSession.roster
        .filter((character) => character.role === "DPS")
        .sort((a, b) => a.class.localeCompare(b.class))

    const handleClone = () => {
        cloneMutation.mutate(raidSession.id, {
            onSuccess: (clonedSession) => {
                toast.success("Session cloned")
                router.push(`/raid-session/${clonedSession.id}`)
            },
            onError: (error) => {
                toast.error(`Failed to clone: ${error.message}`)
            },
        })
    }

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete "${raidSession.name}"?`)) {
            deleteMutation.mutate(raidSession.id, {
                onSuccess: () => {
                    toast.success("Session deleted")
                    router.push("/raid-session")
                },
                onError: (error) => {
                    toast.error(`Failed to delete: ${error.message}`)
                },
            })
        }
    }

    return (
        <div className="w-full min-h-screen overflow-y-auto flex flex-col gap-y-5 p-8 relative">
            {/* Page Header */}
            <div className="bg-muted rounded-lg p-6 shadow-lg flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            router.back()
                        }}
                        className="hover:bg-gray-800 p-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold mb-2 text-blue-400">
                            {raidSession.name}
                        </h1>
                        <div className="flex items-center text-gray-400">
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>
                                {formaUnixTimestampToItalianDate(raidSession.raidDate)}
                            </span>
                        </div>
                        <div className="flex items-center text-gray-400">
                            <Users className="w-4 h-4 mr-2" />
                            <span>
                                {raidSession.roster.length} ({tanks.length}/
                                {healers.length}/{dps.length})
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setIsEditDialogOpen(true)
                        }}
                    >
                        <Edit className="mr-2 h-4 w-4" /> Edit Session
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleClone}
                        disabled={cloneMutation.isPending}
                    >
                        <Copy className="mr-2 h-4 w-4" /> Clone
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                </div>
            </div>

            {/* Roster Panel */}
            <div className="bg-muted p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center">
                        <Users className="mr-2" /> Roster
                    </h2>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setIsImportRosterDialogOpen(true)
                        }}
                    >
                        <PlusIcon className="mr-2 h-4 w-4" /> Import
                    </Button>
                </div>
                <div className="flex flex-wrap gap-x-10">
                    {[
                        { characters: tanks, label: "Tanks" },
                        { characters: healers, label: "Healers" },
                        { characters: dps, label: "DPS" },
                    ].map(({ characters, label }) => (
                        <div key={label} className="mb-4">
                            <p className="text-sm text-muted-foreground mb-2">{label}</p>
                            <div className="flex gap-2 flex-wrap">
                                {characters.map((character) => (
                                    <div
                                        key={character.id}
                                        className="flex items-center gap-2 bg-background/50 px-2 py-1 rounded cursor-pointer hover:bg-background"
                                        onClick={() => {
                                            router.push(`/roster/${character.id}`)
                                        }}
                                    >
                                        <WowClassIcon
                                            wowClassName={character.class}
                                            className="h-6 w-6 rounded"
                                        />
                                        <span className="text-sm">{character.name}</span>
                                    </div>
                                ))}
                                {characters.length === 0 && (
                                    <span className="text-muted-foreground text-sm">
                                        None
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Loots Panel */}
            <div className="bg-muted p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center text-yellow-400">
                        <ShoppingBag className="mr-2" /> Loots
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                            ({loots?.length ?? 0} items)
                        </span>
                    </h2>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                router.push(`/assign?sessionId=${raidSession.id}`)
                            }}
                        >
                            <LucideMedal className="mr-2 h-4 w-4" /> Assign
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setIsAddLootDialogOpen(true)
                            }}
                        >
                            <PlusIcon className="mr-2 h-4 w-4" /> Add
                        </Button>
                    </div>
                </div>
                {loots && loots.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {loots.slice(0, 12).map((loot) => (
                            <div
                                key={loot.id}
                                className="flex items-center gap-2 bg-background/50 p-2 rounded"
                            >
                                <Image
                                    src={`https://wow.zamimg.com/images/wow/icons/medium/${loot.gearItem.item.iconName}.jpg`}
                                    alt={loot.gearItem.item.name}
                                    width={32}
                                    height={32}
                                    className="rounded"
                                />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs truncate">
                                        {loot.gearItem.item.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {loot.gearItem.itemLevel} {loot.raidDifficulty}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {loots.length > 12 && (
                            <div className="flex items-center justify-center text-muted-foreground text-sm">
                                +{loots.length - 12} more
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-muted-foreground">
                        No loot imported yet. Use the Add button to add loot.
                    </p>
                )}
            </div>

            {/* Dialogs */}
            <RaidSessionDialog
                isOpen={isEditDialogOpen}
                setOpen={setIsEditDialogOpen}
                existingSession={raidSession}
            />
            <SessionRosterImportDialog
                isOpen={isImportRosterDialogOpen}
                setOpen={setIsImportRosterDialogOpen}
                raidSessionId={raidSession.id}
            />
            <SessionLootNewDialog
                isOpen={isAddLootDialogOpen}
                setOpen={setIsAddLootDialogOpen}
                raidSessionId={raidSession.id}
            />
        </div>
    )
}

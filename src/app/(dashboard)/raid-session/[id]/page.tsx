"use client"

import {
    Calendar,
    Copy,
    Edit,
    LucideMedal,
    PlusIcon,
    ShoppingBag,
    Trash2,
    Users,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import RaidSessionDialog from "@/components/raid-session-dialog"
import SessionLootNewDialog from "@/components/session-loot-new-dialog"
import { SessionLootsPanel } from "@/components/session-loots-panel"
import SessionRosterImportDialog from "@/components/session-roster-dialog"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { GlassCard } from "@/components/ui/glass-card"
import { IconButton } from "@/components/ui/icon-button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { SectionHeader } from "@/components/ui/section-header"
import { WowClassIcon } from "@/components/wow/wow-class-icon"
import { useLootsBySessionWithItem } from "@/lib/queries/loots"
import {
    useCloneRaidSession,
    useDeleteRaidSession,
    useRaidSession,
} from "@/lib/queries/raid-sessions"
import { formaUnixTimestampToItalianDate } from "@/shared/libs/date/date-utils"
import { s } from "@/shared/libs/safe-stringify"

export default function RaidSessionPage() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const raidSessionId = params.id

    // Dialog states
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isImportRosterDialogOpen, setIsImportRosterDialogOpen] = useState(false)
    const [isAddLootDialogOpen, setIsAddLootDialogOpen] = useState(false)

    const { data: raidSession, isLoading } = useRaidSession(raidSessionId)
    const { data: loots } = useLootsBySessionWithItem(raidSessionId)
    const cloneMutation = useCloneRaidSession()
    const deleteMutation = useDeleteRaidSession()

    if (isLoading) {
        return <LoadingSpinner size="lg" iconSize="lg" text="Loading session..." />
    }

    if (!raidSession) {
        return (
            <EmptyState
                icon={<Calendar className="w-8 h-8" />}
                title="Session not found"
                description="This raid session doesn't exist or has been deleted"
                action={
                    <Button
                        variant="outline"
                        onClick={() => {
                            router.push("/raid-session")
                        }}
                    >
                        Back to Sessions
                    </Button>
                }
            />
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
            <GlassCard padding="lg" className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <IconButton
                        icon={<Calendar className="w-4 h-4" />}
                        onClick={() => {
                            router.back()
                        }}
                        variant="default"
                    />
                    <div>
                        <h1 className="text-2xl font-bold mb-1 text-primary">
                            {raidSession.name}
                        </h1>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center">
                                <Calendar className="mr-2 h-4 w-4" />
                                <span>
                                    {formaUnixTimestampToItalianDate(
                                        raidSession.raidDate
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center">
                                <Users className="w-4 h-4 mr-2" />
                                <span>
                                    {s(raidSession.roster.length)} ({s(tanks.length)}/
                                    {s(healers.length)}/{s(dps.length)})
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                            setIsEditDialogOpen(true)
                        }}
                    >
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleClone}
                        disabled={cloneMutation.isPending}
                    >
                        <Copy className="mr-2 h-4 w-4" /> Clone
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                </div>
            </GlassCard>

            {/* Roster Panel */}
            <GlassCard padding="lg">
                <div className="flex justify-between items-center mb-4">
                    <SectionHeader icon={<Users className="w-4 h-4" />}>
                        Roster
                    </SectionHeader>
                    <Button
                        variant="secondary"
                        size="sm"
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
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                                {label}
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                {characters.map((character) => (
                                    <div
                                        key={character.id}
                                        className="flex items-center gap-2 bg-card/50 border border-border/50 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-card hover:border-primary/30 transition-all"
                                        onClick={() => {
                                            router.push(`/roster/${character.id}`)
                                        }}
                                    >
                                        <WowClassIcon
                                            wowClassName={character.class}
                                            className="h-6 w-6 rounded-lg"
                                        />
                                        <span className="text-sm">{character.name}</span>
                                    </div>
                                ))}
                                {characters.length === 0 && (
                                    <span className="text-muted-foreground/60 text-sm italic">
                                        None
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            {/* Loots Panel */}
            <GlassCard padding="lg">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <SectionHeader icon={<ShoppingBag className="w-4 h-4" />}>
                            Loots
                        </SectionHeader>
                        <span className="text-sm text-muted-foreground">
                            ({s(loots?.length ?? 0)} items)
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                router.push(`/assign?sessionId=${raidSession.id}`)
                            }}
                        >
                            <LucideMedal className="mr-2 h-4 w-4" /> Assign
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                setIsAddLootDialogOpen(true)
                            }}
                        >
                            <PlusIcon className="mr-2 h-4 w-4" /> Add
                        </Button>
                    </div>
                </div>
                <SessionLootsPanel raidSessionId={raidSession.id} />
            </GlassCard>

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

"use client"

import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Suspense, useState, type JSX } from "react"
import { LoaderCircle, ArrowRightLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { WowClassIcon } from "@/components/wow/wow-class-icon"
import { useRaidSessions, useRaidSession } from "@/lib/queries/raid-sessions"
import {
    useLootsBySessionWithAssigned,
    useAssignLoot,
    useUnassignLoot,
    useTradeLoot,
    useUntradeLoot,
} from "@/lib/queries/loots"
import type { LootWithAssigned, Character } from "@/shared/types/types"
import { toast } from "sonner"

function LootRow({
    loot,
    rosterCharacters,
}: {
    loot: LootWithAssigned
    rosterCharacters: Character[]
}) {
    const assignLoot = useAssignLoot()
    const unassignLoot = useUnassignLoot()
    const tradeLoot = useTradeLoot()
    const untradeLoot = useUntradeLoot()

    const handleAssign = (charId: string) => {
        if (charId === "unassigned") {
            unassignLoot.mutate(loot.id, {
                onError: () => toast.error("Failed to unassign loot"),
            })
        } else {
            assignLoot.mutate(
                { charId, lootId: loot.id, highlights: null },
                { onError: () => toast.error("Failed to assign loot") }
            )
        }
    }

    const handleToggleTrade = () => {
        if (loot.tradedToAssigned) {
            untradeLoot.mutate(loot.id, {
                onError: () => toast.error("Failed to update trade status"),
            })
        } else {
            tradeLoot.mutate(loot.id, {
                onError: () => toast.error("Failed to update trade status"),
            })
        }
    }

    const gearItem = loot.gearItem

    return (
        <TableRow>
            <TableCell className="w-12">
                <Image
                    src={`https://wow.zamimg.com/images/wow/icons/large/${gearItem.item.iconName}.jpg`}
                    alt={gearItem.item.name}
                    width={32}
                    height={32}
                    className="rounded"
                />
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-medium">{gearItem.item.name}</span>
                    <span className="text-xs text-muted-foreground">
                        ilvl {gearItem.itemLevel} - {loot.raidDifficulty}
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <Select
                    value={loot.assignedCharacterId ?? "unassigned"}
                    onValueChange={handleAssign}
                >
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="unassigned">
                            <span className="text-muted-foreground">Unassigned</span>
                        </SelectItem>
                        {rosterCharacters.map((char) => (
                            <SelectItem key={char.id} value={char.id}>
                                <div className="flex items-center gap-2">
                                    <WowClassIcon
                                        wowClassName={char.class}
                                        className="w-4 h-4"
                                    />
                                    <span>{char.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </TableCell>
            <TableCell>
                {loot.assignedCharacter && (
                    <Button
                        variant={loot.tradedToAssigned ? "default" : "outline"}
                        size="sm"
                        onClick={handleToggleTrade}
                        disabled={tradeLoot.isPending || untradeLoot.isPending}
                    >
                        <ArrowRightLeft className="h-4 w-4 mr-1" />
                        {loot.tradedToAssigned ? "Traded" : "Not Traded"}
                    </Button>
                )}
            </TableCell>
            <TableCell>
                {loot.assignedHighlights && (
                    <div className="text-xs space-y-1">
                        {loot.assignedHighlights.dpsGain > 0 && (
                            <span className="text-green-500">
                                +{loot.assignedHighlights.dpsGain.toLocaleString()} DPS
                            </span>
                        )}
                        {loot.assignedHighlights.gearIsBis && (
                            <span className="ml-2 text-purple-400">BIS</span>
                        )}
                    </div>
                )}
            </TableCell>
        </TableRow>
    )
}

function AssignContent() {
    const searchParams = useSearchParams()
    const sessionIdParam = searchParams.get("sessionId")
    const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(
        sessionIdParam ?? undefined
    )

    const { data: sessions, isLoading: sessionsLoading } = useRaidSessions()
    const { data: session, isLoading: sessionLoading } = useRaidSession(selectedSessionId)
    const { data: loots, isLoading: lootsLoading } =
        useLootsBySessionWithAssigned(selectedSessionId)

    const isLoading =
        sessionsLoading || (selectedSessionId && (sessionLoading || lootsLoading))

    // Get roster characters from the session
    const rosterCharacters = session?.roster ?? []

    // Stats
    const assignedCount = loots?.filter((l) => l.assignedCharacterId).length ?? 0
    const tradedCount = loots?.filter((l) => l.tradedToAssigned).length ?? 0
    const totalCount = loots?.length ?? 0

    return (
        <div className="w-full flex flex-col gap-6">
            {/* Session Selector */}
            <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Raid Session:</label>
                <Select
                    value={selectedSessionId ?? ""}
                    onValueChange={(v) => {
                        setSelectedSessionId(v || undefined)
                    }}
                >
                    <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select a session" />
                    </SelectTrigger>
                    <SelectContent>
                        {sessions?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                                {s.name} -{" "}
                                {new Date(s.raidDate * 1000).toLocaleDateString()}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isLoading && (
                <div className="flex justify-center p-8">
                    <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {selectedSessionId && !isLoading && (
                <>
                    {/* Stats */}
                    <div className="flex gap-6 p-4 bg-muted rounded-lg">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Loot</p>
                            <p className="text-2xl font-bold">{totalCount}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Assigned</p>
                            <p className="text-2xl font-bold text-green-500">
                                {assignedCount}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Traded</p>
                            <p className="text-2xl font-bold text-blue-500">
                                {tradedCount}
                            </p>
                        </div>
                    </div>

                    {/* Loot Table */}
                    {loots && loots.length > 0 ? (
                        <div className="rounded-lg border bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12"></TableHead>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Assigned To</TableHead>
                                        <TableHead>Trade Status</TableHead>
                                        <TableHead>Info</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loots.map((loot) => (
                                        <LootRow
                                            key={loot.id}
                                            loot={loot}
                                            rosterCharacters={rosterCharacters}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="bg-muted p-8 rounded-lg text-center">
                            <p className="text-muted-foreground">
                                No loot found for this session. Import loot to get
                                started.
                            </p>
                        </div>
                    )}
                </>
            )}

            {!selectedSessionId && !sessionsLoading && (
                <div className="bg-muted p-8 rounded-lg text-center">
                    <p className="text-muted-foreground">
                        Select a raid session to manage loot assignments.
                    </p>
                </div>
            )}
        </div>
    )
}

export default function AssignPage(): JSX.Element {
    return (
        <div className="w-full min-h-screen flex flex-col gap-y-6 p-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Loot Assignment</h1>
                <p className="text-muted-foreground">
                    Assign loot to raid members based on droptimizer data.
                </p>
            </div>
            <Suspense fallback={<LoaderCircle className="animate-spin" />}>
                <AssignContent />
            </Suspense>
        </div>
    )
}

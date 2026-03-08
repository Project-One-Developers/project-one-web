"use client"

import { Eye, Loader2, Users } from "lucide-react"
import { useCallback, useMemo, useState, type JSX } from "react"
import { toast } from "sonner"
import {
    importGuildMembers,
    previewGuildRoster,
    type GuildRankPreview,
} from "@/actions/blizzard"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { unwrap } from "@/lib/errors"
import { s } from "@/shared/libs/string-utils"

type GuildImportDialogProps = {
    isOpen: boolean
    setOpen: (open: boolean) => void
    onImportComplete: (result: {
        imported: number
        skipped: number
        errors: string[]
    }) => void
}

export function GuildImportDialog({
    isOpen,
    setOpen,
    onImportComplete,
}: GuildImportDialogProps): JSX.Element {
    const [isPreviewing, setIsPreviewing] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [previewData, setPreviewData] = useState<{
        ranks: GuildRankPreview[]
        totalMembers: number
        defaultImportRanks: number[]
    } | null>(null)
    const [selectedRanks, setSelectedRanks] = useState<Set<number>>(new Set())

    const selectedMemberCount = useMemo(() => {
        if (!previewData) {
            return 0
        }
        return previewData.ranks
            .filter((r) => selectedRanks.has(r.rank))
            .reduce((sum, r) => sum + r.memberCount, 0)
    }, [previewData, selectedRanks])

    const handleOpenChange = useCallback(
        (open: boolean) => {
            setOpen(open)
            if (!open) {
                setPreviewData(null)
                setSelectedRanks(new Set())
                setIsPreviewing(false)
                setIsImporting(false)
            }
        },
        [setOpen]
    )

    const handlePreview = async () => {
        setIsPreviewing(true)
        try {
            const data = await unwrap(previewGuildRoster())
            setPreviewData(data)
            setSelectedRanks(new Set(data.defaultImportRanks))
        } catch (error) {
            toast.error(`Failed to fetch guild roster: ${s(error)}`)
        } finally {
            setIsPreviewing(false)
        }
    }

    const handleToggleRank = (rank: number, checked: boolean) => {
        setSelectedRanks((prev) => {
            const next = new Set(prev)
            if (checked) {
                next.add(rank)
            } else {
                next.delete(rank)
            }
            return next
        })
    }

    const handleImport = async () => {
        setIsImporting(true)
        try {
            const result = await unwrap(
                importGuildMembers([...selectedRanks])
            )
            onImportComplete(result)
            handleOpenChange(false)
        } catch (error) {
            toast.error(`Guild import failed: ${s(error)}`)
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import Guild Members</DialogTitle>
                    <DialogDescription>
                        Preview the guild roster and select which ranks to
                        import.
                    </DialogDescription>
                </DialogHeader>

                {!previewData ? (
                    <div className="flex flex-col items-center gap-4 py-6">
                        {isPreviewing ? (
                            <>
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">
                                    Fetching guild roster...
                                </p>
                            </>
                        ) : (
                            <>
                                <Users className="h-10 w-10 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">
                                    Fetch the roster to see members grouped by
                                    rank.
                                </p>
                                <Button
                                    onClick={() => void handlePreview()}
                                >
                                    <Eye className="h-4 w-4" />
                                    Preview Roster
                                </Button>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-muted-foreground">
                            {s(previewData.totalMembers)} total members across{" "}
                            {s(previewData.ranks.length)} ranks
                        </p>

                        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                            {previewData.ranks.map((rankData) => (
                                <label
                                    key={rankData.rank}
                                    className="flex items-start gap-3 rounded-xl border border-border/40 p-3 cursor-pointer hover:border-primary/30 transition-colors"
                                >
                                    <Checkbox
                                        checked={selectedRanks.has(
                                            rankData.rank
                                        )}
                                        onCheckedChange={(checked) => {
                                            handleToggleRank(
                                                rankData.rank,
                                                checked === true
                                            )
                                        }}
                                        className="mt-0.5"
                                    />
                                    <div className="min-w-0 grow">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">
                                                Rank {rankData.rank}
                                            </span>
                                            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                                                {rankData.memberCount}{" "}
                                                {rankData.memberCount === 1
                                                    ? "member"
                                                    : "members"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                                            {rankData.sampleNames.join(", ")}
                                            {rankData.memberCount > 5 &&
                                                ` +${s(rankData.memberCount - 5)} more`}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    handleOpenChange(false)
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => void handleImport()}
                                disabled={
                                    selectedRanks.size === 0 || isImporting
                                }
                            >
                                {isImporting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Users className="h-4 w-4" />
                                )}
                                Import Selected ({selectedMemberCount})
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

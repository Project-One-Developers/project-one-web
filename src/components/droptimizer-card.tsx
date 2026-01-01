"use client"

import { LoaderCircle, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { useDeleteDroptimizer } from "@/lib/queries/droptimizers"
import { getDpsHumanReadable } from "@/lib/utils"
import { formatUnixTimestampToRelativeDays } from "@/shared/libs/date-utils"
import type { Character } from "@/shared/models/character.models"
import type { Droptimizer, DroptimizerUpgrade } from "@/shared/models/simulation.models"
import DroptimizerDetailDialog from "./droptimizer-detail-dialog"
import { Dialog, DialogTrigger } from "./ui/dialog"
import { GlassCard } from "./ui/glass-card"
import { IconButton } from "./ui/icon-button"
import { WowItemIcon } from "./wow/wow-item-icon"
import { WowSpecIcon } from "./wow/wow-spec-icon"

const UpgradeItem = ({ upgrade }: { upgrade: DroptimizerUpgrade }) => {
    return (
        <div className="-mr-3 relative">
            <WowItemIcon
                item={upgrade.item}
                iconOnly={true}
                ilvl={upgrade.ilvl}
                iconClassName="object-cover object-top rounded-full h-9 w-9 border border-background"
            />
            <p className="text-xs text-center font-medium mt-1">
                {getDpsHumanReadable(upgrade.dps)}
            </p>
        </div>
    )
}

type DroptimizerCardProps = {
    droptimizer: Droptimizer
    character?: Character
}

export const DroptimizerCard = ({
    droptimizer: dropt,
    character,
}: DroptimizerCardProps) => {
    const router = useRouter()
    const deleteMutation = useDeleteDroptimizer()
    const [isDetailOpen, setIsDetailOpen] = useState(false)

    const charName = character?.name ?? "Unknown"

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (
            window.confirm(`Are you sure you want to delete ${charName}'s droptimizer?`)
        ) {
            deleteMutation.mutate(dropt.id, {
                onSuccess: () => {
                    toast.success("Droptimizer deleted")
                },
                onError: (error) => {
                    toast.error(`Failed to delete: ${error.message}`)
                },
            })
        }
    }

    const isStandard = dropt.simInfo.nTargets === 1 && dropt.simInfo.duration === 300

    return (
        <GlassCard
            padding="lg"
            className="flex flex-col justify-between h-57.5 w-77.5 relative group"
        >
            {/* Delete Button */}
            <IconButton
                icon={
                    deleteMutation.isPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                        <X className="h-4 w-4" />
                    )
                }
                variant="destructive"
                size="sm"
                className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
            />

            {/* Character Info */}
            <div className="flex items-center space-x-3">
                <WowSpecIcon
                    specId={dropt.charInfo.specId}
                    className="object-cover object-top rounded-xl h-10 w-10 border-2 border-border/50"
                />
                {character?.id ? (
                    <div
                        className="font-bold cursor-pointer hover:text-primary transition-colors"
                        onClick={() => {
                            router.push(`/roster/${character.id}`)
                        }}
                    >
                        {charName}
                    </div>
                ) : (
                    <h2 className="font-bold">{charName}</h2>
                )}
            </div>

            {/* Sim Info */}
            <div className="text-xs mt-3 space-y-1 text-muted-foreground">
                <p>
                    <span className="text-foreground font-medium">Raid:</span>{" "}
                    {dropt.raidInfo.difficulty}
                </p>
                <p>
                    <span className="text-foreground font-medium">Fight Style:</span>{" "}
                    <span className={isStandard ? "" : "text-orange-400"}>
                        {dropt.simInfo.fightstyle} ({dropt.simInfo.nTargets}){" "}
                        {dropt.simInfo.duration}s
                    </span>
                </p>
                <p title={new Date(dropt.simInfo.date * 1000).toLocaleString()}>
                    <span className="text-foreground font-medium">Date:</span>{" "}
                    {formatUnixTimestampToRelativeDays(dropt.simInfo.date)}
                </p>
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogTrigger asChild>
                        <p className="cursor-pointer text-primary hover:underline">
                            <span className="font-medium">Upgrades:</span>{" "}
                            {dropt.upgrades.length}
                        </p>
                    </DialogTrigger>
                    <DroptimizerDetailDialog
                        droptimizer={dropt}
                        characterName={charName}
                    />
                </Dialog>
            </div>

            {/* Top Upgrades Preview */}
            <div className="flex items-center gap-3 mt-1">
                {dropt.upgrades
                    .sort((a, b) => b.dps - a.dps)
                    .slice(0, 6)
                    .map((upgrade) => (
                        <UpgradeItem key={upgrade.item.id} upgrade={upgrade} />
                    ))}
            </div>
        </GlassCard>
    )
}

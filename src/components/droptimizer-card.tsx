"use client"

import { LoaderCircle, X } from "lucide-react"
import { toast } from "sonner"

import { useRouter } from "next/navigation"

import { useDeleteDroptimizer } from "@/lib/queries/droptimizers"
import { getDpsHumanReadable } from "@/lib/utils"
import { formatUnixTimestampToRelativeDays } from "@/shared/libs/date/date-utils"
import type { Character, Droptimizer, DroptimizerUpgrade } from "@/shared/types/types"

import { Button } from "./ui/button"
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

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (
            window.confirm(
                `Are you sure you want to delete ${dropt.charInfo.name}'s droptimizer?`
            )
        ) {
            deleteMutation.mutate(dropt.url, {
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
        <div className="flex flex-col justify-between p-6 bg-muted h-[230px] w-[310px] rounded-lg relative">
            {/* Delete Button */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-2"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
            >
                {deleteMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                    <X className="h-4 w-4" />
                )}
            </Button>

            {/* Character Info */}
            <div className="flex items-center space-x-3">
                <WowSpecIcon
                    specId={dropt.charInfo.specId}
                    className="object-cover object-top rounded-md h-10 w-10 border border-background"
                />
                {character?.id ? (
                    <div
                        className="font-black cursor-pointer hover:text-primary"
                        onClick={() => {
                            router.push(`/roster/${character.id}`)
                        }}
                    >
                        {dropt.charInfo.name}
                    </div>
                ) : (
                    <h2 className="font-black">{dropt.charInfo.name}</h2>
                )}
            </div>

            {/* Sim Info */}
            <div className="text-xs mt-3 space-y-1">
                <p>
                    <strong>Raid:</strong> {dropt.raidInfo.difficulty}
                </p>
                <p>
                    <strong>Fight Style:</strong>{" "}
                    <span className={isStandard ? "" : "text-red-500"}>
                        {dropt.simInfo.fightstyle} ({dropt.simInfo.nTargets}){" "}
                        {dropt.simInfo.duration}s
                    </span>
                </p>
                <p title={new Date(dropt.simInfo.date * 1000).toLocaleString()}>
                    <strong>Date:</strong>{" "}
                    {formatUnixTimestampToRelativeDays(dropt.simInfo.date)}
                </p>
                <p>
                    <strong>Upgrades:</strong> {dropt.upgrades.length}
                </p>
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
        </div>
    )
}

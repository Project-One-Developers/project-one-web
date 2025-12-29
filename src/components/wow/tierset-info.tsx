"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { GearItem } from "@/shared/models/item.model"
import { WowGearIcon } from "./wow-gear-icon"

type TiersetInfoProps = {
    tierset: GearItem[]
    className?: string
}

export function TiersetInfo({ tierset, className }: TiersetInfoProps) {
    const tierSlots = ["head", "shoulder", "chest", "hands", "legs"]
    const omniItems = tierset.filter((t) => t.item.slotKey === "omni")

    return (
        <div className={cn("flex flex-row gap-1", className)}>
            {/* Standard Tier Slots */}
            {tierSlots.map((slot) => {
                const tiersetItem = tierset.find((t) => t.item.slotKey === slot)
                return (
                    <div key={slot} className="flex flex-col items-center space-x-1">
                        <span className="text-[9px] text-gray-400">{slot}</span>
                        {tiersetItem ? (
                            tiersetItem.source === "bag" ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="relative text-yellow-500">
                                            <WowGearIcon
                                                gearItem={tiersetItem}
                                                showTiersetLine={false}
                                            />
                                            {/* Badge for Items in Bag */}
                                            <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full w-4 h-4 flex items-center justify-center">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-3 w-3 text-white"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>In Bag (Not Equipped)</TooltipContent>
                                </Tooltip>
                            ) : (
                                <WowGearIcon
                                    gearItem={tiersetItem}
                                    showTiersetLine={false}
                                />
                            )
                        ) : (
                            <div className="w-8 h-8 bg-gray-700 border border-cyan-400/50 rounded-md"></div>
                        )}
                    </div>
                )
            })}

            {/* Omni Slot Items */}
            {omniItems.length > 0 && (
                <div className="flex flex-row gap-1">
                    {omniItems.map((omniItem, index) => (
                        <div key={index} className="flex flex-col items-center space-x-1">
                            <span className="text-[9px] text-gray-400">omni</span>
                            {omniItem.source === "bag" ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="relative">
                                            <WowGearIcon
                                                gearItem={omniItem}
                                                showTiersetLine={false}
                                            />
                                            {/* Badge for Items in Bag */}
                                            <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full w-4 h-4 flex items-center justify-center">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-3 w-3 text-white"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>In Bag (Not Equipped)</TooltipContent>
                                </Tooltip>
                            ) : (
                                <WowGearIcon
                                    gearItem={omniItem}
                                    showTiersetLine={false}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

"use client"

import { LoaderCircle } from "lucide-react"
import Image from "next/image"
import { useItem } from "@/lib/queries/items"
import { cn } from "@/lib/utils"
import { formatWowSlotKey } from "@/shared/libs/items/item-slot-utils"
import { getIconUrl } from "@/shared/libs/items/item-url-utils"
import { isHealerSpecs, isTankSpecs } from "@/shared/libs/spec-parser/spec-utils"
import { s } from "@/shared/libs/string-utils"
import type { Item } from "@/shared/models/item.models"
import type { WowRaidDifficulty } from "@/shared/models/wow.models"
import { useRefreshWowheadTooltips, WOWHEAD_HOST } from "./wowhead-tooltips"

type WowItemIconProps = {
    item: Item | number
    iconOnly?: boolean
    raidDiff?: WowRaidDifficulty
    ilvl?: number
    className?: string
    iconClassName?: string
    showSlot?: boolean
    showSubclass?: boolean
    showIlvl?: boolean
    showRoleIcons?: boolean
    tierBanner?: boolean
    catalystBanner?: boolean
}

export function WowItemIcon({
    item,
    iconOnly = false,
    raidDiff,
    ilvl,
    className,
    iconClassName,
    showSlot = true,
    showSubclass = true,
    showIlvl = true,
    showRoleIcons = false,
    tierBanner = false,
    catalystBanner = false,
}: WowItemIconProps) {
    // Only fetch if item is a number (ID)
    const { data: fetchedItem, isLoading } = useItem(
        typeof item === "number" ? item : undefined
    )

    // Resolve the item data
    const itemData = typeof item === "number" ? fetchedItem : item

    // Refresh Wowhead tooltips when item changes (must be called before any early return)
    useRefreshWowheadTooltips([itemData?.id, ilvl, raidDiff])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center">
                <LoaderCircle className="animate-spin h-6 w-6" />
            </div>
        )
    }

    if (!itemData) {
        if (typeof item === "number") {
            return (
                <a
                    href={`https://${WOWHEAD_HOST}/item=${s(item)}`}
                    rel="noreferrer"
                    target="_blank"
                    className="text-blue-400 hover:underline"
                >
                    Item #{s(item)}
                </a>
            )
        }
        return null
    }

    const getIlvl = () => {
        if (ilvl !== undefined) {
            return ilvl
        }
        switch (raidDiff) {
            case "Heroic":
                return itemData.ilvlHeroic
            case "Mythic":
                return itemData.ilvlMythic
            case "Normal":
                return itemData.ilvlNormal
            default:
                return itemData.ilvlBase
        }
    }

    const currentIlvl = getIlvl()
    const hrefString = `https://${WOWHEAD_HOST}/item=${s(itemData.id)}&ilvl=${s(currentIlvl)}`
    const dataWowhead = `item=${s(itemData.id)}&ilvl=${s(currentIlvl)}`

    // Role badges
    const healerItem = showRoleIcons ? isHealerSpecs(itemData.specIds) : undefined
    const tankItem = showRoleIcons ? isTankSpecs(itemData.specIds) : undefined

    return (
        <a href={hrefString} rel="noreferrer" target="_blank" data-wowhead={dataWowhead}>
            <div className={cn("flex items-center", className)}>
                <div className="relative inline-block">
                    <Image
                        src={getIconUrl(itemData.iconName)}
                        alt={itemData.name}
                        width={40}
                        height={40}
                        className={cn(
                            "object-cover object-top rounded-full h-10 w-10 border border-background",
                            iconClassName
                        )}
                        unoptimized
                    />
                    {catalystBanner && (
                        <div className="absolute top-0 right-1 bg-red-600 text-white text-[7px] font-bold px-2 rounded-b-sm border border-background">
                            CAT
                        </div>
                    )}
                    {tierBanner && (itemData.tierset || itemData.token) && (
                        <div className="absolute -bottom-1 left-0 right-0 h-px bg-red-600"></div>
                    )}
                    {healerItem && (
                        <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-500 rounded-sm flex items-center justify-center">
                            <svg
                                className="w-3 h-3 text-yellow-900"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 2a1.5 1.5 0 011.5 1.5v4h4a1.5 1.5 0 110 3h-4v4a1.5 1.5 0 11-3 0v-4h-4a1.5 1.5 0 110-3h4v-4A1.5 1.5 0 0110 2z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                    )}
                    {tankItem && (
                        <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-500 rounded-sm flex items-center justify-center">
                            <svg
                                className="w-3 h-3 text-yellow-900"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                    )}
                </div>
                {!iconOnly && (
                    <div id="item-info" className="flex flex-col ml-3">
                        <p className="font-black text-xs">{itemData.name}</p>
                        <div className="flex text-xs">
                            {showSlot && itemData.slotKey !== "trinket" ? (
                                <span className="mr-1">
                                    {formatWowSlotKey(itemData.slotKey)}
                                </span>
                            ) : null}
                            {showSubclass && itemData.itemSubclass ? (
                                <span className="mr-1 text-muted-foreground/80">
                                    {itemData.itemSubclass}
                                </span>
                            ) : null}
                            {showIlvl && currentIlvl ? (
                                <span>
                                    {(showSlot && itemData.slotKey !== "trinket") ||
                                    (showSubclass && itemData.itemSubclass)
                                        ? "• "
                                        : ""}
                                    {currentIlvl}
                                </span>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>
        </a>
    )
}

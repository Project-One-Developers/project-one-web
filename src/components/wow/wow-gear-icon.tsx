"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import {
    gearhasSocket,
    gearTertiary,
    parseItemTrackName,
} from "@/shared/libs/items/item-bonus-utils"
import { formatWowSlotKey } from "@/shared/libs/items/item-slot-utils"
import { trackNameToWowDiff } from "@/shared/libs/items/item-tracks"
import { isHealerSpecs, isTankSpecs } from "@/shared/libs/spec-parser/spec-utils"
import { s } from "@/shared/libs/string-utils"
import type { GearItem } from "@/shared/models/item.models"
import { useRefreshWowheadTooltips } from "./wowhead-tooltips"

type WowGearIconProps = {
    gearItem: GearItem
    showTiersetLine?: boolean
    showTiersetRibbon?: boolean
    showItemTrackDiff?: boolean
    showExtendedInfo?: boolean
    flipExtendedInfo?: boolean
    convertItemTrackToRaidDiff?: boolean
    showSlot?: boolean
    showArmorType?: boolean
    className?: string
    iconClassName?: string
    showRoleIcons?: boolean
    showSource?: boolean
}

const TOKEN_CLASS_MAP = {
    Venerated: "Pal/Pri/Sha",
    Dreadful: "Lock/Dh/Dk",
    Mystic: "Hun/Mag/Dru",
    Zenith: "W/R/M/E",
} as const

// Default icon size when iconClassName is not provided
const DEFAULT_ICON_CLASS = "h-8 w-8 rounded-lg border border-background"

export function WowGearIcon({
    gearItem,
    showTiersetLine = false,
    showTiersetRibbon = false,
    showItemTrackDiff = true,
    showExtendedInfo = false,
    flipExtendedInfo = false,
    convertItemTrackToRaidDiff = true,
    showSlot = false,
    showArmorType = false,
    showRoleIcons = false,
    className,
    iconClassName,
    showSource = false,
}: WowGearIconProps) {
    const { item, itemLevel, bonusIds, enchantIds, gemIds, itemTrack, source } = gearItem
    const { id, iconName, tierset, token, name, slotKey, armorType, specIds } = item

    const hasSocket = gearhasSocket(bonusIds)
    const hasSpecials = hasSocket || gearTertiary(bonusIds)
    const iconUrl = `https://wow.zamimg.com/images/wow/icons/large/${iconName}.jpg`

    const hrefString = `https://www.wowhead.com/item=${s(id)}&ilvl=${s(itemLevel)}${
        bonusIds?.length ? `&bonus=${bonusIds.join(":")}` : ""
    }${
        enchantIds?.length ? `&ench=${enchantIds.join(":")}` : ""
    }${gemIds?.length ? `&gems=${gemIds.join(":")}` : ""}`

    const dataWowhead = `item=${s(id)}&ilvl=${s(itemLevel)}${
        bonusIds?.length ? `&bonus=${bonusIds.join(":")}` : ""
    }${
        enchantIds?.length ? `&ench=${enchantIds.join(":")}` : ""
    }${gemIds?.length ? `&gems=${gemIds.join(":")}` : ""}`

    // Refresh Wowhead tooltips when gear changes
    useRefreshWowheadTooltips([id, itemLevel, bonusIds, enchantIds, gemIds])

    // role badges
    const healerItem = showRoleIcons ? isHealerSpecs(specIds) : undefined
    const tankItem = showRoleIcons ? isTankSpecs(specIds) : undefined

    const getItemTrackAbbr = () => {
        if (!showItemTrackDiff) {
            return ""
        }

        if (itemTrack) {
            return convertItemTrackToRaidDiff
                ? trackNameToWowDiff(itemTrack.name)
                : itemTrack.name
        }

        if (bonusIds) {
            const parsedTrackName = parseItemTrackName(bonusIds, token, tierset)
            if (parsedTrackName) {
                return convertItemTrackToRaidDiff
                    ? trackNameToWowDiff(parsedTrackName)
                    : parsedTrackName
            }
        }

        return ""
    }

    const itemTrackAbbr = getItemTrackAbbr()

    // Extended info JSX
    const extendedInfoElement = showExtendedInfo ? (
        <div
            id="item-info"
            className={cn(
                "flex flex-col space-y-0.5 max-w-75",
                flipExtendedInfo ? "mr-3" : "ml-3"
            )}
        >
            <p
                className={cn(
                    "font-semibold text-sm text-gray-100 leading-tight truncate",
                    flipExtendedInfo && "text-right"
                )}
                title={name}
            >
                {name}
            </p>
            <div
                className={cn(
                    "flex items-center space-x-2",
                    flipExtendedInfo && "justify-end"
                )}
            >
                {/* Item level and track - most important stats, medium emphasis */}
                <div className="flex items-center space-x-1">
                    <span className="font-medium text-sm text-blue-300">{itemLevel}</span>
                    {itemTrackAbbr && (
                        <span className="text-xs text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded">
                            {itemTrackAbbr}
                        </span>
                    )}
                </div>
                {/* Secondary information - lower emphasis */}
                <div className="flex items-center text-xs text-gray-400 space-x-1">
                    {showSlot && (
                        <span className="bg-gray-700/50 px-1.5 py-0.5 rounded">
                            {formatWowSlotKey(slotKey)}
                        </span>
                    )}
                    {showArmorType && (armorType || token) && (
                        <span className="bg-gray-700/50 px-1.5 py-0.5 rounded">
                            {token ? "Token" : armorType}
                        </span>
                    )}
                    {token &&
                        (() => {
                            const tokenType = Object.keys(TOKEN_CLASS_MAP).find((type) =>
                                name.startsWith(type)
                            )
                            if (!tokenType) {
                                return null
                            }
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Validated by find
                            const key = tokenType as keyof typeof TOKEN_CLASS_MAP
                            return (
                                <span className="bg-gray-700/50 px-1.5 py-0.5 rounded">
                                    {TOKEN_CLASS_MAP[key]}
                                </span>
                            )
                        })()}
                </div>
            </div>
        </div>
    ) : null

    return (
        <a href={hrefString} rel="noreferrer" target="_blank" data-wowhead={dataWowhead}>
            <div className={cn("flex flex-row items-center", className)}>
                {flipExtendedInfo && extendedInfoElement}

                <div className="flex flex-col items-center">
                    {showSource && (
                        <span className="text-[10px] text-gray-400 font-medium mb-0.5 truncate max-w-8 leading-tight">
                            {source}
                        </span>
                    )}
                    {/* Fixed-size container for icon and all overlays */}
                    <div className={cn("relative", iconClassName ?? DEFAULT_ICON_CLASS)}>
                        <Image
                            src={iconUrl}
                            alt=""
                            width={48}
                            height={48}
                            className={cn(
                                "w-full h-full object-cover object-top",
                                hasSpecials && "border-white"
                            )}
                        />
                        {showTiersetLine && (tierset || token) && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></div>
                        )}
                        {showTiersetRibbon && tierset && (
                            <div className="absolute -top-1 left-0 right-0 h-2 bg-linear-to-r from-purple-400 via-purple-500 to-purple-400 flex items-center justify-center">
                                <span className="text-white text-[6px] font-bold tracking-wide drop-shadow-sm">
                                    TIER
                                </span>
                            </div>
                        )}
                        {hasSocket && (
                            <div className="absolute bottom-0 right-0">
                                <Image
                                    src="https://www.raidbots.com/frontend/c6217d2ee6dd7647cbfa.png"
                                    alt="socket"
                                    width={12}
                                    height={12}
                                    className="border"
                                />
                            </div>
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
                    {!showExtendedInfo && (
                        <div className="flex items-center mt-1">
                            <span className="font-medium text-xs text-blue-300">
                                {itemLevel}
                            </span>
                            {itemTrackAbbr && (
                                <span className="font-medium text-xs text-blue-300">
                                    {itemTrackAbbr.charAt(0)}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {!flipExtendedInfo && extendedInfoElement}
            </div>
        </a>
    )
}

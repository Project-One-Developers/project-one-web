"use client"

import Image from "next/image"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { classIcon } from "@/lib/wow-icon"
import type { WowClassName } from "@/shared/models/wow.model"

type WowClassIconProps = {
    wowClassName: WowClassName
    showTooltip?: boolean
    charname?: string
    className?: string
    size?: number
}

export const WowClassIcon = ({
    wowClassName,
    showTooltip,
    charname,
    className,
    size = 32,
}: WowClassIconProps) => {
    const iconUrl = classIcon.get(wowClassName)

    if (!iconUrl) {
        return null
    }

    const image = (
        <Image
            src={iconUrl}
            alt={`Class ${wowClassName}`}
            width={size}
            height={size}
            className={cn("object-cover object-top", className)}
        />
    )

    if (!showTooltip) {
        return image
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{image}</TooltipTrigger>
            <TooltipContent sideOffset={5}>{charname}</TooltipContent>
        </Tooltip>
    )
}

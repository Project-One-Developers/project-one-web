"use client"

import Image from "next/image"
import { s } from "@/lib/safe-stringify"
import { specIcon } from "@/lib/wow-icon"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type WowSpecIconProps = {
    specId: number
    showTooltip?: boolean
    className?: string
    size?: number
}

export const WowSpecIcon = ({
    specId,
    showTooltip,
    className,
    size = 32,
}: WowSpecIconProps) => {
    const iconUrl = specIcon.get(specId)

    if (!iconUrl) {
        return null
    }

    const image = (
        <Image
            src={iconUrl}
            alt={`Spec ${s(specId)}`}
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
            <TooltipContent sideOffset={5}>Spec ID: {specId}</TooltipContent>
        </Tooltip>
    )
}

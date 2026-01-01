"use client"

import Image from "next/image"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { specIcon } from "@/lib/wow-icon"
import { s } from "@/shared/libs/safe-stringify"

type WowSpecIconProps = {
    specId: number
    showTooltip?: boolean
    className?: string
    size?: number
    title?: string
}

export const WowSpecIcon = ({
    specId,
    showTooltip,
    className,
    size = 32,
    title,
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
            title={title}
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

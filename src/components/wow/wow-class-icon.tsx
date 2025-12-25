"use client"

import { classIcon } from "@/lib/wow-icon"
import type { WowClassName } from "@/shared/types/types"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import React from "react"

interface WowClassIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    wowClassName: WowClassName
    showTooltip?: boolean
    charname?: string
}

export const WowClassIcon: React.FC<WowClassIconProps> = ({
    wowClassName,
    showTooltip,
    charname,
    ...props
}) => {
    if (!showTooltip) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={classIcon.get(wowClassName)}
                alt={`Class ${wowClassName}`}
                {...props}
            />
        )
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={classIcon.get(wowClassName)}
                    alt={`Class ${wowClassName}`}
                    {...props}
                />
            </TooltipTrigger>
            <TooltipContent sideOffset={5}>{charname}</TooltipContent>
        </Tooltip>
    )
}

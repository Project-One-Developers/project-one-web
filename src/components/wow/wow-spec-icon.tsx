'use client'

import { specIcon } from '@/lib/wow-icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import React from 'react'

interface WowSpecIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    specId: number
    showTooltip?: boolean
}

export const WowSpecIcon: React.FC<WowSpecIconProps> = ({
    specId,
    showTooltip,
    ...props
}) => {
    const iconUrl = specIcon.get(specId) || ''

    if (!showTooltip) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={iconUrl} alt={`Spec ${specId}`} {...props} />
        )
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={iconUrl} alt={`Spec ${specId}`} {...props} />
            </TooltipTrigger>
            <TooltipContent sideOffset={5}>Spec ID: {specId}</TooltipContent>
        </Tooltip>
    )
}

'use client'

import { cn } from '@/lib/utils'
import { classIcon } from '@/lib/wow-icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { CharacterSummary } from '@/shared/types/types'
import { useRouter } from 'next/navigation'
import { type JSX } from 'react'
import { WowCharacterLink } from './wow-character-links'

const CharacterTooltip = ({
    summary,
    isLowItemLevel
}: {
    summary: CharacterSummary
    isLowItemLevel: boolean
}) => (
    <div className="flex flex-col gap-1 p-2 bg-gray-800 rounded text-xs">
        <div className="font-medium text-white">
            {summary.character.name} ({summary.character.main ? 'Main' : 'Alt'})
        </div>
        <div className="text-gray-400">{summary.character.realm.replaceAll('-', ' ')}</div>
        <div className={cn('font-medium', isLowItemLevel ? 'text-red-400' : 'text-blue-400')}>
            Item Level: {summary.itemLevel}
            {isLowItemLevel && ' (Below Average)'}
        </div>
        <div className="flex flex-row gap-2">
            <WowCharacterLink character={summary.character} site="raiderio" />
            <WowCharacterLink character={summary.character} site="warcraftlogs" />
            <WowCharacterLink character={summary.character} site="armory" />
        </div>
    </div>
)

export const CharacterOverviewIcon = ({
    charsWithSummary,
    className,
    isLowItemLevel
}: {
    charsWithSummary: CharacterSummary[]
    className?: string
    isLowItemLevel?: (itemLevel: string) => boolean
}): JSX.Element => {
    const router = useRouter()

    const getBorderColor = (char: CharacterSummary): string => {
        if (char.character.main) {
            return 'border-red-500'
        }

        if (isLowItemLevel && isLowItemLevel(char.itemLevel)) {
            return 'border-orange-500'
        }

        return 'border-background'
    }

    const getItemLevelTextColor = (char: CharacterSummary): string => {
        if (isLowItemLevel && isLowItemLevel(char.itemLevel)) {
            return 'text-orange-400'
        }
        return 'text-foreground'
    }

    return (
        <div className={cn('flex items-center gap-2', className)}>
            {charsWithSummary
                .sort((a, b) => (b.character.main ? 1 : 0) - (a.character.main ? 1 : 0))
                .map(item => {
                    const isLow = isLowItemLevel ? isLowItemLevel(item.itemLevel) : false
                    return (
                        <div className="-mr-4 relative group" key={item.character.id}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className="cursor-pointer flex flex-col items-center"
                                        onClick={() => router.push(`/roster/${item.character.id}`)}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            height={50}
                                            width={50}
                                            src={classIcon.get(item.character.class)}
                                            alt={item.character.class}
                                            className={cn(
                                                'object-cover !m-0 !p-0 object-top rounded-full h-12 w-12 border group-hover:scale-105 group-hover:z-30 relative transition duration-500',
                                                getBorderColor(item),
                                                isLow && 'ring-2 ring-orange-300 ring-opacity-50'
                                            )}
                                        />
                                        <div
                                            className={cn(
                                                'text-xs text-center mt-1 font-medium',
                                                getItemLevelTextColor(item)
                                            )}
                                        >
                                            {Math.round(parseInt(item.itemLevel)) || '?'}
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="TooltipContent" sideOffset={5}>
                                    <CharacterTooltip summary={item} isLowItemLevel={isLow} />
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )
                })}
        </div>
    )
}

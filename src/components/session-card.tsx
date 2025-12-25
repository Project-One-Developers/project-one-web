'use client'

import { formatUnixTimestampForDisplay, unixTimestampToWowWeek } from '@/shared/libs/date/date-utils'
import type { RaidSessionWithSummary } from '@/shared/types/types'
import { Calendar, Gem, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

type SessionCardProps = {
    session: RaidSessionWithSummary
    className?: string
    onClick?: () => void
}

const SessionCard = ({ session, className, onClick }: SessionCardProps) => {
    return (
        <div
            className={cn(
                'bg-muted rounded-lg border border-gray-900 cursor-pointer hover:bg-gray-700 transition-colors min-w-64 relative flex flex-col',
                className
            )}
            onClick={onClick}
        >
            <div className="p-4 flex-1">
                <h3 className="text-xl font-bold truncate max-w-[220px] mb-2">{session.name}</h3>
                <div className="flex items-center text-gray-400 mb-1">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>
                        {formatUnixTimestampForDisplay(session.raidDate)} -{' '}
                        {unixTimestampToWowWeek(session.raidDate)}
                    </span>
                </div>
                <div className="flex items-center text-gray-400 mb-1">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{session.rosterCount} participants</span>
                </div>
                <div className="flex items-center text-gray-400">
                    <Gem className="w-4 h-4 mr-2" />
                    <span>{session.lootCount} loots</span>
                </div>
            </div>
        </div>
    )
}

export default SessionCard

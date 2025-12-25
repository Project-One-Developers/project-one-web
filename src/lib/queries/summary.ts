'use client'

import { getRosterSummaryAction } from '@/actions/summary'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './keys'

export function useRosterSummary() {
    return useQuery({
        queryKey: [queryKeys.rosterSummary],
        queryFn: () => getRosterSummaryAction()
    })
}

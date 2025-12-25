'use client'

import {
    deleteConfigAction,
    getAllConfigAction,
    getConfigAction,
    setConfigAction
} from '@/actions/settings'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './keys'

export function useConfig(key: string) {
    return useQuery({
        queryKey: [queryKeys.settings, key],
        queryFn: () => getConfigAction(key)
    })
}

export function useAllConfig() {
    return useQuery({
        queryKey: [queryKeys.settings, 'all'],
        queryFn: () => getAllConfigAction()
    })
}

export function useSetConfig() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ key, value }: { key: string; value: string }) => setConfigAction(key, value),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.settings, vars.key] })
            queryClient.invalidateQueries({ queryKey: [queryKeys.settings, 'all'] })
        }
    })
}

export function useDeleteConfig() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (key: string) => deleteConfigAction(key),
        onSuccess: (_, key) => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.settings, key] })
            queryClient.invalidateQueries({ queryKey: [queryKeys.settings, 'all'] })
        }
    })
}

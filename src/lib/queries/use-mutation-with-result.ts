"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { defined } from "@/lib/utils"
import type { Result, VoidResult } from "@/shared/types/types"

type ResultMutationOptions<TData, TVariables> = {
    /** Server action that returns Result<TData> */
    mutationFn: (variables: TVariables) => Promise<Result<TData>>
    /** Query keys to invalidate on success (each array is passed to invalidateQueries) */
    invalidateKeys?: string[][]
    /** Success toast message - can be string or function receiving the data */
    successMessage?: string | ((data: TData) => string)
    /** Error toast message - can be string or function receiving the error (defaults to showing error directly) */
    errorMessage?: string | ((error: string) => string)
    /** Called on success with the data */
    onSuccess?: (data: TData, variables: TVariables) => void
    /** Called on error with the error message */
    onError?: (error: string, variables: TVariables) => void
}

/**
 * Custom hook for mutations that return Result<T>.
 * Auto-handles:
 * - Query invalidation on success
 * - Success/error toast notifications
 * - Proper typing for Result pattern
 *
 * @example
 * const mutation = useMutationWithResult({
 *   mutationFn: addCharacter,
 *   invalidateKeys: [[queryKeys.characters], [queryKeys.players]],
 *   successMessage: (char) => `Added ${char.name}`,
 * })
 *
 * mutation.mutate(data, {
 *   onSuccess: () => setOpen(false) // Component-specific logic
 * })
 */
export function useMutationWithResult<TData, TVariables = void>({
    mutationFn,
    invalidateKeys = [],
    successMessage,
    errorMessage,
    onSuccess,
    onError,
}: ResultMutationOptions<TData, TVariables>) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn,
        onSuccess: (result, variables) => {
            if (result.success) {
                // Invalidate queries
                for (const key of invalidateKeys) {
                    void queryClient.invalidateQueries({ queryKey: key })
                }

                // Show success toast
                if (successMessage) {
                    const message =
                        typeof successMessage === "function"
                            ? successMessage(result.data)
                            : successMessage
                    toast.success(message)
                }

                // Call user's onSuccess
                onSuccess?.(result.data, variables)
            } else {
                // Show error toast
                const message = !defined(errorMessage)
                    ? result.error
                    : typeof errorMessage === "function"
                      ? errorMessage(result.error)
                      : errorMessage
                toast.error(message)

                // Call user's onError
                onError?.(result.error, variables)
            }
        },
    })
}

type VoidResultMutationOptions<TVariables> = {
    /** Server action that returns VoidResult */
    mutationFn: (variables: TVariables) => Promise<VoidResult>
    /** Query keys to invalidate on success */
    invalidateKeys?: string[][]
    /** Success toast message */
    successMessage?: string
    /** Error toast message - can be string or function receiving the error */
    errorMessage?: string | ((error: string) => string)
    /** Called on success */
    onSuccess?: (variables: TVariables) => void
    /** Called on error with the error message */
    onError?: (error: string, variables: TVariables) => void
}

/**
 * Same as useMutationWithResult but for void-returning actions.
 *
 * @example
 * const mutation = useVoidMutationWithResult({
 *   mutationFn: deleteCharacter,
 *   invalidateKeys: [[queryKeys.characters]],
 *   successMessage: "Character deleted",
 * })
 */
export function useVoidMutationWithResult<TVariables = void>({
    mutationFn,
    invalidateKeys = [],
    successMessage,
    errorMessage,
    onSuccess,
    onError,
}: VoidResultMutationOptions<TVariables>) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn,
        onSuccess: (result, variables) => {
            if (result.success) {
                // Invalidate queries
                for (const key of invalidateKeys) {
                    void queryClient.invalidateQueries({ queryKey: key })
                }

                // Show success toast
                if (successMessage) {
                    toast.success(successMessage)
                }

                // Call user's onSuccess
                onSuccess?.(variables)
            } else {
                // Show error toast
                const message = !defined(errorMessage)
                    ? result.error
                    : typeof errorMessage === "function"
                      ? errorMessage(result.error)
                      : errorMessage
                toast.error(message)

                // Call user's onError
                onError?.(result.error, variables)
            }
        },
    })
}

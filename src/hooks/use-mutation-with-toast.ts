"use client"

import {
    useMutation,
    useQueryClient,
    type UseMutationOptions,
} from "@tanstack/react-query"
import { toast } from "sonner"
import { ActionError, type SerializedAppError } from "@/lib/errors"
import type { ActionResult } from "@/lib/errors/action-wrapper"

type ToastMessages<TData> = {
    loading?: string
    success?: string | ((data: TData) => string)
    error?: string | ((error: SerializedAppError) => string)
}

type MutationWithToastOptions<TData, TVariables> = {
    /** The server action to call */
    mutationFn: (variables: TVariables) => Promise<ActionResult<TData>>
    /** Toast messages for different states */
    toast?: ToastMessages<TData>
    /** Query keys to invalidate on success */
    invalidateKeys?: unknown[][]
    /** Additional mutation options */
    options?: Omit<UseMutationOptions<TData, ActionError, TVariables>, "mutationFn">
}

/**
 * Helper to throw an ActionError from a failed result.
 * Satisfies @typescript-eslint/only-throw-error rule.
 */
function throwActionError(error: SerializedAppError): never {
    throw new ActionError(error)
}

/**
 * Custom hook that wraps useMutation with automatic toast notifications
 * and Result unwrapping.
 *
 * @example
 * const addCharacter = useMutationWithToast({
 *     mutationFn: addCharacterWithSync,
 *     toast: {
 *         loading: "Adding character...",
 *         success: (data) => `Character ${data?.name ?? "added"} successfully`,
 *         error: "Failed to add character",
 *     },
 *     invalidateKeys: [[queryKeys.characters], [queryKeys.players]],
 * })
 *
 * // Usage
 * addCharacter.mutate({ name: "Thrall", realm: "Pozzo dell'Eternità" })
 */
export function useMutationWithToast<TData, TVariables>({
    mutationFn,
    toast: toastMessages,
    invalidateKeys,
    options,
}: MutationWithToastOptions<TData, TVariables>) {
    const queryClient = useQueryClient()

    return useMutation<TData, ActionError, TVariables>({
        mutationFn: async (variables) => {
            const result = await mutationFn(variables)

            if (!result.success) {
                throwActionError(result.error)
            }

            return result.data
        },
        onMutate: () => {
            if (toastMessages?.loading) {
                toast.loading(toastMessages.loading, { id: "mutation-toast" })
            }
        },
        onSuccess: (data) => {
            toast.dismiss("mutation-toast")

            if (toastMessages?.success) {
                const message =
                    typeof toastMessages.success === "function"
                        ? toastMessages.success(data)
                        : toastMessages.success
                toast.success(message)
            }

            // Invalidate queries
            if (invalidateKeys) {
                for (const key of invalidateKeys) {
                    void queryClient.invalidateQueries({ queryKey: key })
                }
            }
        },
        onError: (error) => {
            toast.dismiss("mutation-toast")

            const message =
                typeof toastMessages?.error === "function"
                    ? toastMessages.error(error.serialized)
                    : (toastMessages?.error ?? error.message)

            toast.error(message)
        },
        ...options,
    })
}

type VoidMutationWithToastOptions<TVariables> = {
    /** The server action to call */
    mutationFn: (variables: TVariables) => Promise<ActionResult<void>>
    /** Toast messages for different states */
    toast?: Omit<ToastMessages<undefined>, "success"> & { success?: string }
    /** Query keys to invalidate on success */
    invalidateKeys?: unknown[][]
    /** Additional mutation options */
    options?: Omit<UseMutationOptions<undefined, ActionError, TVariables>, "mutationFn">
}

/**
 * Variant for void-returning actions (uses ActionResult<void>)
 */
export function useVoidMutationWithToast<TVariables>({
    mutationFn,
    toast: toastMessages,
    invalidateKeys,
    options,
}: VoidMutationWithToastOptions<TVariables>) {
    const queryClient = useQueryClient()

    return useMutation<undefined, ActionError, TVariables>({
        mutationFn: async (variables) => {
            const result = await mutationFn(variables)

            if (!result.success) {
                throwActionError(result.error)
            }
            return undefined
        },
        onMutate: () => {
            if (toastMessages?.loading) {
                toast.loading(toastMessages.loading, { id: "mutation-toast" })
            }
        },
        onSuccess: () => {
            toast.dismiss("mutation-toast")

            if (toastMessages?.success) {
                toast.success(toastMessages.success)
            }

            if (invalidateKeys) {
                for (const key of invalidateKeys) {
                    void queryClient.invalidateQueries({ queryKey: key })
                }
            }
        },
        onError: (error) => {
            toast.dismiss("mutation-toast")

            const message =
                typeof toastMessages?.error === "function"
                    ? toastMessages.error(error.serialized)
                    : (toastMessages?.error ?? error.message)

            toast.error(message)
        },
        ...options,
    })
}

/**
 * Helper to extract error message from SerializedAppError
 */
export function getErrorMessage(error: SerializedAppError): string {
    return error.message
}

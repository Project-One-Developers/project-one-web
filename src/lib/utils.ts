import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const defined = <T>(value: T | null | undefined): value is T =>
    value !== null && value !== undefined

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getDpsHumanReadable(dps: number): string {
    const formatter = Intl.NumberFormat("en", { notation: "compact" })
    return formatter.format(dps)
}

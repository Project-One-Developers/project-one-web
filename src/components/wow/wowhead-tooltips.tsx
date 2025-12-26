"use client"

import Script from "next/script"
import { useEffect, useCallback } from "react"

declare global {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Window {
        $WowheadPower?: {
            refreshLinks: () => void
        }
        whTooltips?: {
            colorLinks: boolean
            iconizeLinks: boolean
            renameLinks: boolean
            iconSize: string
        }
    }
}

export function WowheadTooltips() {
    return (
        <>
            <Script id="wowhead-config" strategy="afterInteractive">
                {`window.whTooltips = { colorLinks: false, iconizeLinks: false, renameLinks: false };`}
            </Script>
            <Script
                src="https://wow.zamimg.com/js/tooltips.js"
                strategy="afterInteractive"
            />
        </>
    )
}

export function useWowheadTooltips() {
    const refresh = useCallback(() => {
        if (typeof window !== "undefined" && window.$WowheadPower) {
            window.$WowheadPower.refreshLinks()
        }
    }, [])

    return { refresh }
}

export function useRefreshWowheadTooltips(deps: unknown[] = []) {
    useEffect(() => {
        // Small delay to ensure DOM is ready
        const timeout = setTimeout(() => {
            if (typeof window !== "undefined" && window.$WowheadPower) {
                window.$WowheadPower.refreshLinks()
            }
        }, 100)

        return () => {
            clearTimeout(timeout)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
}

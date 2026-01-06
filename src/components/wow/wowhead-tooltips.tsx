"use client"

import Script from "next/script"
import { useEffect } from "react"
import { clientEnv } from "@/env.client"

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

/**
 * Wowhead host for tooltips and links.
 * Override with NEXT_PUBLIC_OVERRIDE_WOWHEAD_HOST for PTR/beta (e.g., "ptr.wowhead.com").
 */
export const WOWHEAD_HOST =
    clientEnv.NEXT_PUBLIC_OVERRIDE_WOWHEAD_HOST ?? "www.wowhead.com"

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

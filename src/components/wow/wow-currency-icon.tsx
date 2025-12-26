"use client"

import Image from "next/image"
import { s } from "@/lib/safe-stringify"
import { currencyIcon } from "@/lib/wow-icon"
import type { DroptimizerCurrency } from "@/shared/types/types"
import { cn } from "@/lib/utils"

type WowCurrencyIconProps = {
    currency: DroptimizerCurrency
    iconClassName?: string
    size?: number
}

export function WowCurrencyIcon({
    currency,
    iconClassName,
    size = 32,
}: WowCurrencyIconProps) {
    const currencyHref = `https://www.wowhead.com/${currency.type}=${s(currency.id)}`
    const currencyInfo = currencyIcon.get(currency.id)

    if (!currencyInfo) {
        // Currency icon not found - silently skip rendering
        return null
    }

    return (
        <a
            className="flex items-center justify-center"
            href={currencyHref}
            rel="noreferrer"
            target="_blank"
        >
            <div className="flex flex-col items-center justify-center relative group">
                <Image
                    src={currencyInfo.url}
                    alt={currencyInfo.name}
                    width={size}
                    height={size}
                    className={cn(
                        "object-cover object-top rounded-lg border border-background",
                        iconClassName
                    )}
                />
                <p className="text-bold text-[11px]">{currency.amount}</p>
            </div>
        </a>
    )
}

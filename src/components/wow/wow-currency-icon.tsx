'use client'

import { currencyIcon } from '@/lib/wow-icon'
import type { DroptimizerCurrency } from '@/shared/types/types'

type WowCurrencyIconProps = {
    currency: DroptimizerCurrency
    iconClassName?: string
}

export function WowCurrencyIcon({ currency, iconClassName }: WowCurrencyIconProps) {
    const currencyHref = `https://www.wowhead.com/${currency.type}=${currency.id}`
    const currencyInfo = currencyIcon.get(currency.id)

    if (!currencyInfo) {
        console.log("Skipping currency icon because it doesn't exist: " + currencyHref)
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={currencyInfo?.url}
                    alt={currencyInfo?.name}
                    className={`${iconClassName || 'object-cover object-top rounded-lg h-8 w-8 border border-background'} block`}
                />
                <p className="text-bold text-[11px]">{currency.amount}</p>
            </div>
        </a>
    )
}

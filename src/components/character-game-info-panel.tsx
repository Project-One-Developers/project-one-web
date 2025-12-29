"use client"

import { LoaderCircle, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import Image from "next/image"
import { useMemo, useState } from "react"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCharacterGameInfo } from "@/lib/queries/players"
import { defined } from "@/lib/utils"
import {
    isCurrencyBlacklisted,
    isRelevantCurrency,
} from "@/shared/libs/currency/currency-utils"
import { formatUnixTimestampForDisplay } from "@/shared/libs/date/date-utils"
import type { Character } from "@/shared/models/character.model"
import type { CharacterRaiderio } from "@/shared/models/raiderio.model"
import type { Droptimizer } from "@/shared/models/simulation.model"
import type { CharacterWowAudit } from "@/shared/models/wowaudit.model"
import DroptimizerData from "./droptimizer-data"
import { CurrentGreatVaultPanel } from "./greatvault-current-panel"
import { NextGreatVaultPanel } from "./greatvault-next-panel"
import RaiderioData from "./raiderio-data"
import WowAuditData from "./wow-audit-data"
import { WowCurrencyIcon } from "./wow/wow-currency-icon"

type CharGameInfoPanelProps = {
    character: Character
}

export const CharGameInfoPanel = ({ character }: CharGameInfoPanelProps) => {
    const charGameInfoQuery = useCharacterGameInfo(character.name, character.realm)

    const droptimizer = charGameInfoQuery.data?.droptimizer ?? null
    const currencies = charGameInfoQuery.data?.droptimizer?.currencies ?? null
    const wowauditData = charGameInfoQuery.data?.wowaudit ?? null
    const raiderioData = charGameInfoQuery.data?.raiderio ?? null
    const nextWeekChest = wowauditData?.greatVault ?? null

    // Memoize sidebar data check to prevent unnecessary re-renders
    const hasSidebarData = useMemo(() => {
        const hasCurrencies = Boolean(currencies && currencies.length > 0)
        const hasCurrentVault = Boolean(
            droptimizer?.weeklyChest && droptimizer.weeklyChest.length > 0
        )

        // Check if nextWeekChest has any non-null values
        const hasNextVault = Boolean(
            nextWeekChest && Object.values(nextWeekChest).some((slot) => slot !== null)
        )

        return hasCurrencies || hasCurrentVault || hasNextVault
    }, [currencies, droptimizer?.weeklyChest, nextWeekChest])

    const [sidebarOpen, setSidebarOpen] = useState<boolean>(hasSidebarData)

    if (charGameInfoQuery.isLoading) {
        return (
            <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                <LoaderCircle className="animate-spin text-5xl" />
            </div>
        )
    }

    return (
        <div className="flex gap-6">
            {/* Collapsible Left Sidebar */}
            <Collapsible open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <div className="flex items-start gap-2">
                    {/* Sidebar Toggle Button */}
                    <CollapsibleTrigger className="sticky top-4 z-10 p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors">
                        {sidebarOpen ? (
                            <PanelLeftClose className="h-4 w-4" />
                        ) : (
                            <PanelLeftOpen className="h-4 w-4" />
                        )}
                    </CollapsibleTrigger>

                    {/* Sidebar Content */}
                    <CollapsibleContent className="data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left">
                        <div className="w-80 space-y-4">
                            <CurrenciesPanel currencies={currencies} />
                            <CurrentGreatVaultPanel droptimizer={droptimizer} />
                            <NextGreatVaultPanel greatVault={nextWeekChest} />
                        </div>
                    </CollapsibleContent>
                </div>
            </Collapsible>

            {/* Main Content - Character Gear */}
            <div className="flex-1 min-w-0">
                <div className="bg-muted rounded-lg relative">
                    <GearInfo
                        wowAudit={wowauditData}
                        droptimizer={droptimizer}
                        raiderio={raiderioData}
                    />
                </div>
            </div>
        </div>
    )
}

type CurrenciesPanelProps = {
    currencies:
        | {
              id: number
              type: string
              amount: number
          }[]
        | null
}

export const CurrenciesPanel = ({ currencies }: CurrenciesPanelProps) => {
    // Filter out blacklisted currencies at the data level
    const filteredCurrencies =
        currencies?.filter((currency) => !isCurrencyBlacklisted(currency.id)) ?? []
    const relevantCurrencies = filteredCurrencies
        .filter((c) => isRelevantCurrency(c.id))
        .sort((a, b) => a.id - b.id)

    return (
        <div className="flex flex-col p-6 bg-muted rounded-lg relative">
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">Currencies</h4>
            <div className="flex gap-4">
                {relevantCurrencies.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                        No currency info found
                    </div>
                ) : (
                    relevantCurrencies.map((currency) => (
                        <div key={currency.id} className="flex items-center gap-2">
                            <WowCurrencyIcon
                                currency={currency}
                                iconClassName="object-cover object-top rounded-lg h-6 w-6 border border-background"
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

type GearInfoProps = {
    wowAudit: CharacterWowAudit | null
    droptimizer: Droptimizer | null
    raiderio: CharacterRaiderio | null
}

const GearInfo = ({ wowAudit, droptimizer, raiderio }: GearInfoProps) => {
    let wowAuditNewer = defined(wowAudit)
    if (droptimizer && wowAudit) {
        if (droptimizer.simInfo.date > wowAudit.wowauditLastModifiedUnixTs) {
            wowAuditNewer = false
        }
    }

    // Determine which tabs have data
    const hasRaiderioData = defined(raiderio)
    const hasDroptimizerData = defined(droptimizer)
    const hasWowAuditData = defined(wowAudit)

    // Determine default tab - prioritize the newest data
    const getDefaultTab = () => {
        if (hasRaiderioData) {
            return "raiderio"
        }
        if (hasWowAuditData && wowAuditNewer) {
            return "wowaudit"
        }
        if (hasDroptimizerData) {
            return "droptimizer"
        }
        if (hasWowAuditData) {
            return "wowaudit"
        }
        return "raiderio" // fallback
    }

    // If no data at all
    if (!hasRaiderioData && !hasDroptimizerData && !hasWowAuditData) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                No gear data available from any source
            </div>
        )
    }

    return (
        <div className="rounded-lg w-full relative bg-background shadow-lg p-4">
            <Tabs defaultValue={getDefaultTab()} className="w-full">
                <TabsList className="flex justify-start space-x-4 border-b pb-2 mb-6 bg-transparent">
                    {hasRaiderioData && (
                        <TabsTrigger
                            value="raiderio"
                            className="flex flex-col items-start gap-1 px-4 py-2 hover:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                        >
                            <div className="flex items-center gap-2">
                                <Image
                                    src="https://cdn.raiderio.net/images/mstile-150x150.png"
                                    alt="RaiderIO"
                                    width={24}
                                    height={24}
                                    className="rounded-full"
                                />
                                <span>RaiderIO</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {formatUnixTimestampForDisplay(raiderio.itemUpdateAt)}
                            </span>
                        </TabsTrigger>
                    )}
                    {hasDroptimizerData && (
                        <TabsTrigger
                            value="droptimizer"
                            className="flex flex-col items-start gap-1 px-4 py-2 hover:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                        >
                            <div className="flex items-center gap-2">
                                <Image
                                    src="https://assets.rpglogs.com/img/warcraft/raidbots-icon.png"
                                    alt="Droptimizer"
                                    width={24}
                                    height={24}
                                    className="rounded-full"
                                />
                                <span>Droptimizer</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {formatUnixTimestampForDisplay(droptimizer.simInfo.date)}
                            </span>
                        </TabsTrigger>
                    )}
                    {hasWowAuditData && (
                        <TabsTrigger
                            value="wowaudit"
                            className="flex flex-col items-start gap-1 px-4 py-2 hover:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                        >
                            <div className="flex items-center gap-2">
                                <Image
                                    src="https://data.wowaudit.com/img/new-logo-icon.svg"
                                    alt="WoW Audit"
                                    width={24}
                                    height={24}
                                    className="rounded-full"
                                />
                                <span>WoW Audit</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {formatUnixTimestampForDisplay(
                                    wowAudit.wowauditLastModifiedUnixTs
                                )}
                            </span>
                        </TabsTrigger>
                    )}
                </TabsList>

                {hasRaiderioData && (
                    <TabsContent value="raiderio">
                        <RaiderioData data={raiderio} />
                    </TabsContent>
                )}

                {hasDroptimizerData && (
                    <TabsContent value="droptimizer">
                        <DroptimizerData data={droptimizer} />
                    </TabsContent>
                )}

                {hasWowAuditData && (
                    <TabsContent value="wowaudit">
                        <WowAuditData data={wowAudit} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}

export default CharGameInfoPanel

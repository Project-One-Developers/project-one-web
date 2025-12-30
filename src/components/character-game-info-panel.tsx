"use client"

import { LoaderCircle, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { match, P } from "ts-pattern"
import { z } from "zod"
import { getCharacterRenderUrl } from "@/actions/characters"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCharacterGameInfo } from "@/lib/queries/players"
import { getClassBackgroundStyle } from "@/shared/libs/class-backgrounds"
import {
    isCurrencyBlacklisted,
    isRelevantCurrency,
} from "@/shared/libs/currency/currency-utils"
import { formatUnixTimestampForDisplay } from "@/shared/libs/date/date-utils"
import type { CharacterBlizzard } from "@/shared/models/blizzard.model"
import type { Character } from "@/shared/models/character.model"
import type { Droptimizer } from "@/shared/models/simulation.model"
import type { WowClassName } from "@/shared/models/wow.model"
import BlizzardData from "./blizzard-data"
import DroptimizerData from "./droptimizer-data"
import { CurrentGreatVaultPanel } from "./greatvault-current-panel"
import { WowCurrencyIcon } from "./wow/wow-currency-icon"

type CharGameInfoPanelProps = {
    character: Character
}

export const CharGameInfoPanel = ({ character }: CharGameInfoPanelProps) => {
    const charGameInfoQuery = useCharacterGameInfo(character.name, character.realm)

    const droptimizer = charGameInfoQuery.data?.droptimizer ?? null
    const currencies = charGameInfoQuery.data?.droptimizer?.currencies ?? null
    const blizzardData = charGameInfoQuery.data?.blizzard ?? null

    // Memoize sidebar data check to prevent unnecessary re-renders
    const hasSidebarData = useMemo(() => {
        const hasCurrencies = Boolean(currencies && currencies.length > 0)
        const hasCurrentVault = Boolean(
            droptimizer?.weeklyChest && droptimizer.weeklyChest.length > 0
        )

        return hasCurrencies || hasCurrentVault
    }, [currencies, droptimizer?.weeklyChest])

    const [sidebarOpen, setSidebarOpen] = useState<boolean>(hasSidebarData)

    if (charGameInfoQuery.isLoading) {
        return (
            <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
                <LoaderCircle className="animate-spin text-5xl" />
            </div>
        )
    }

    return (
        <div className="flex gap-4 h-full">
            {/* Collapsible Left Sidebar */}
            <Collapsible open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <div className="flex items-start gap-2 h-full">
                    {/* Sidebar Toggle Button */}
                    <CollapsibleTrigger className="sticky top-4 z-10 p-1.5 bg-muted hover:bg-muted/80 rounded-lg transition-colors">
                        {sidebarOpen ? (
                            <PanelLeftClose className="h-4 w-4" />
                        ) : (
                            <PanelLeftOpen className="h-4 w-4" />
                        )}
                    </CollapsibleTrigger>

                    {/* Sidebar Content */}
                    <CollapsibleContent className="h-full data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left">
                        <div className="w-72 space-y-3 h-full">
                            <CurrenciesPanel currencies={currencies} />
                            <CurrentGreatVaultPanel droptimizer={droptimizer} />
                        </div>
                    </CollapsibleContent>
                </div>
            </Collapsible>

            {/* Main Content - Character Gear */}
            <div className="flex-1 min-w-0 h-full">
                <div className="bg-muted rounded-lg relative h-full">
                    <GearInfo
                        blizzard={blizzardData}
                        droptimizer={droptimizer}
                        characterName={character.name}
                        realm={character.realm}
                        characterClass={character.class}
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
        <div className="flex flex-col p-4 bg-muted rounded-lg relative">
            <h4 className="text-xs font-medium mb-2 text-muted-foreground">Currencies</h4>
            <div className="flex gap-3">
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
    blizzard: CharacterBlizzard | null
    droptimizer: Droptimizer | null
    characterName: string
    realm: string
    characterClass: WowClassName
}

/**
 * Hook to fetch character render URL from Battle.net API (via server action)
 * Falls back to Raider.io public API if Battle.net is not configured
 */
const raiderioProfileResponseSchema = z.object({
    thumbnail_url: z.string().optional(),
})

function useCharacterRenderUrl(name: string, realm: string) {
    const [renderUrl, setRenderUrl] = useState<string | null>(null)

    useEffect(() => {
        if (!name || !realm) {
            return
        }

        const fetchRenderUrl = async () => {
            try {
                // Try Battle.net API first (via server action)
                const bnetUrl = await getCharacterRenderUrl(name, realm)
                if (bnetUrl) {
                    setRenderUrl(bnetUrl)
                    return
                }

                // Fallback to Raider.io public API for inset image
                const realmSlug = realm.toLowerCase().replace(/\s+/g, "-")
                const response = await fetch(
                    `https://raider.io/api/v1/characters/profile?region=eu&realm=${realmSlug}&name=${encodeURIComponent(name)}`
                )
                if (!response.ok) {
                    return
                }

                const parsed = raiderioProfileResponseSchema.safeParse(
                    await response.json()
                )
                if (parsed.success && parsed.data.thumbnail_url) {
                    // Transform avatar URL to inset render URL
                    const insetUrl = parsed.data.thumbnail_url.replace(
                        "-avatar.jpg",
                        "-inset.jpg"
                    )
                    setRenderUrl(insetUrl)
                }
            } catch {
                // Silently fail - render is optional
            }
        }

        void fetchRenderUrl()
    }, [name, realm])

    return renderUrl
}

const GearInfo = ({
    blizzard,
    droptimizer,
    characterName,
    realm,
    characterClass,
}: GearInfoProps) => {
    // Get character render URL (Battle.net API with Raider.io fallback)
    const characterRenderUrl = useCharacterRenderUrl(characterName, realm)

    // Get class-themed background style
    const classBackgroundStyle = getClassBackgroundStyle(characterClass)

    // Determine default tab or show empty state
    const defaultTab = match({ blizzard, droptimizer })
        .with({ blizzard: null, droptimizer: null }, () => null)
        .with(
            {
                blizzard: { syncedAt: P.number },
                droptimizer: { simInfo: { date: P.number } },
            },
            ({ blizzard: b, droptimizer: d }) =>
                b.syncedAt > d.simInfo.date ? "blizzard" : "droptimizer"
        )
        .with({ blizzard: P.not(null) }, () => "blizzard")
        .with({ droptimizer: P.not(null) }, () => "droptimizer")
        .exhaustive()

    if (defaultTab === null) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                No gear data available from any source
            </div>
        )
    }

    return (
        <div
            className="rounded-lg w-full h-full relative shadow-lg p-3 overflow-hidden flex flex-col"
            style={classBackgroundStyle}
        >
            {/* Noise texture overlay for premium feel */}
            <div
                className="absolute inset-0 opacity-[0.015] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />
            {/* Character Render (transparent PNG over class gradient) */}
            {/* Centered in the middle area between gear columns (280px each side) */}
            {characterRenderUrl && (
                <div className="absolute inset-0 flex items-end justify-center pointer-events-none overflow-hidden px-[280px]">
                    <Image
                        src={characterRenderUrl}
                        alt="Character render"
                        width={936}
                        height={1170}
                        className="object-contain object-bottom h-full max-w-none opacity-90 origin-bottom scale-[1.3] translate-y-[-6%]"
                        unoptimized
                    />
                </div>
            )}
            <Tabs
                defaultValue={defaultTab}
                className="w-full h-full relative z-10 flex flex-col"
            >
                <TabsList className="flex justify-start gap-2 mb-3 bg-transparent h-auto p-0 shrink-0">
                    {blizzard && (
                        <TabsTrigger
                            value="blizzard"
                            className="group relative flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/30 transition-all duration-200 hover:bg-muted/60 hover:border-border data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500/10 data-[state=active]:to-orange-500/10 data-[state=active]:border-amber-500/50 data-[state=active]:shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                        >
                            <div className="relative">
                                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 opacity-0 group-data-[state=active]:opacity-100 blur-sm transition-opacity" />
                                <Image
                                    src="https://wow.zamimg.com/images/wow/icons/large/wow_token01.jpg"
                                    alt="Blizzard"
                                    width={22}
                                    height={22}
                                    className="relative rounded ring-1 ring-border/50 group-data-[state=active]:ring-amber-500/50"
                                />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="font-medium text-xs">Armory</span>
                                <span className="text-[10px] text-muted-foreground">
                                    {formatUnixTimestampForDisplay(blizzard.syncedAt)}
                                </span>
                            </div>
                        </TabsTrigger>
                    )}
                    {droptimizer && (
                        <TabsTrigger
                            value="droptimizer"
                            className="group relative flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/30 transition-all duration-200 hover:bg-muted/60 hover:border-border data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500/10 data-[state=active]:to-cyan-500/10 data-[state=active]:border-blue-500/50 data-[state=active]:shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                        >
                            <div className="relative">
                                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 opacity-0 group-data-[state=active]:opacity-100 blur-sm transition-opacity" />
                                <Image
                                    src="https://assets.rpglogs.com/img/warcraft/raidbots-icon.png"
                                    alt="Droptimizer"
                                    width={22}
                                    height={22}
                                    className="relative rounded ring-1 ring-border/50 group-data-[state=active]:ring-blue-500/50"
                                />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="font-medium text-xs">Droptimizer</span>
                                <span className="text-[10px] text-muted-foreground">
                                    {formatUnixTimestampForDisplay(
                                        droptimizer.simInfo.date
                                    )}
                                </span>
                            </div>
                        </TabsTrigger>
                    )}
                </TabsList>

                {blizzard && (
                    <TabsContent value="blizzard" className="flex-1 min-h-0 mt-0">
                        <BlizzardData data={blizzard} />
                    </TabsContent>
                )}

                {droptimizer && (
                    <TabsContent value="droptimizer" className="flex-1 min-h-0 mt-0">
                        <DroptimizerData data={droptimizer} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}

export default CharGameInfoPanel

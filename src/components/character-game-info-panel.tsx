"use client"

import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"
import { match, P } from "ts-pattern"
import { z } from "zod"
import { getCharacterRenderUrl } from "@/actions/characters"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { EmptyState } from "@/components/ui/empty-state"
import { GlassCard } from "@/components/ui/glass-card"
import { SectionHeader } from "@/components/ui/section-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsWideScreen } from "@/hooks/use-wide-screen"
import { getClassBackgroundStyle } from "@/shared/libs/class-backgrounds"
import { formatUnixTimestampForDisplay } from "@/shared/libs/date-utils"
import { isRelevantCurrency } from "@/shared/libs/season-config"
import type { CharacterBlizzard } from "@/shared/models/blizzard.models"
import type { Character, CharacterGameInfo } from "@/shared/models/character.models"
import type { Droptimizer } from "@/shared/models/simulation.models"
import type { WowClassName } from "@/shared/models/wow.models"
import BlizzardData from "./blizzard-data"
import DroptimizerData from "./droptimizer-data"
import { CurrentGreatVaultPanel } from "./greatvault-current-panel"
import { WowCurrencyIcon } from "./wow/wow-currency-icon"

type CharGameInfoPanelProps = {
    character: Character
    gameInfo?: CharacterGameInfo | null
}

export const CharGameInfoPanel = ({ character, gameInfo }: CharGameInfoPanelProps) => {
    const droptimizer = gameInfo?.droptimizer ?? null
    const currencies = gameInfo?.droptimizer?.currencies ?? null
    const blizzardData = gameInfo?.blizzard ?? null

    // Scale up on wide screens to match appearance at 125% OS scaling
    const isWideScreen = useIsWideScreen()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="flex gap-4 h-full">
            {/* Collapsible Left Sidebar */}
            <Collapsible open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <div className="flex items-start gap-2 h-full">
                    {/* Sidebar Toggle Button */}
                    <CollapsibleTrigger className="sticky top-4 z-10 p-2 bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card hover:border-primary/30 rounded-xl transition-all">
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
            {/* Scale up on wide screens to match appearance at 125% OS scaling */}
            <div
                className="flex-1 min-w-0 h-full origin-top-left"
                style={{
                    zoom: isWideScreen ? 1.25 : 1,
                }}
            >
                <GlassCard padding="none" className="relative h-full overflow-hidden">
                    <GearInfo
                        blizzard={blizzardData}
                        droptimizer={droptimizer}
                        characterName={character.name}
                        realm={character.realm}
                        characterClass={character.class}
                    />
                </GlassCard>
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
    // Filter to only relevant currencies for the current season
    const relevantCurrencies =
        currencies?.filter((c) => isRelevantCurrency(c.id)).sort((a, b) => a.id - b.id) ??
        []

    return (
        <GlassCard className="flex flex-col">
            <SectionHeader className="mb-3">Currencies</SectionHeader>
            <div className="flex gap-3 flex-wrap">
                {relevantCurrencies.length === 0 ? (
                    <div className="text-sm text-muted-foreground/60">
                        No currency info found
                    </div>
                ) : (
                    relevantCurrencies.map((currency) => (
                        <div
                            key={currency.id}
                            className="flex items-center gap-2 px-2 py-1 bg-card/30 rounded-lg border border-border/30"
                        >
                            <WowCurrencyIcon
                                currency={currency}
                                iconClassName="object-cover object-top rounded-lg h-6 w-6 border border-border/50"
                            />
                        </div>
                    ))
                )}
            </div>
        </GlassCard>
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

    // Determine default tab - always prefer armory when available
    const initialTab = match({ blizzard, droptimizer })
        .with({ blizzard: null, droptimizer: null }, () => null)
        .with({ blizzard: P.not(null) }, () => "blizzard")
        .with({ droptimizer: P.not(null) }, () => "droptimizer")
        .exhaustive()

    // Track user's tab selection (null = user hasn't changed, use initialTab)
    const [userSelectedTab, setUserSelectedTab] = useState<string | null>(null)
    const activeTab = userSelectedTab ?? initialTab

    // Get current item levels based on active tab
    const equippedItemLevel =
        activeTab === "blizzard"
            ? blizzard?.equippedItemLevel
            : droptimizer?.itemsAverageItemLevelEquipped
    // Droptimizer only has equipped ilvl, Blizzard API has both
    const averageItemLevel =
        activeTab === "blizzard"
            ? blizzard?.averageItemLevel
            : droptimizer?.itemsAverageItemLevelEquipped

    if (initialTab === null) {
        return (
            <EmptyState
                size="default"
                icon={<span className="text-2xl">⚔</span>}
                title="No gear data available"
                description="Import a Droptimizer report or sync from the Armory"
            />
        )
    }

    return (
        <div
            className="rounded-2xl w-full h-full relative shadow-lg p-4 overflow-hidden flex flex-col"
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
            {/* Centered in the middle area between gear columns */}
            {characterRenderUrl && (
                <div className="absolute inset-x-[22%] inset-y-0 flex items-end justify-center pointer-events-none overflow-hidden">
                    <Image
                        src={characterRenderUrl}
                        alt="Character render"
                        width={936}
                        height={1170}
                        className="object-contain object-bottom h-full max-w-none opacity-90 origin-bottom scale-130 -translate-y-[6%]"
                        unoptimized
                    />
                </div>
            )}
            {/* Floating Item Level Card */}
            {equippedItemLevel && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className="px-4 py-2 rounded-xl bg-black/60 backdrop-blur-sm border border-border/50 shadow-lg">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Item Level
                            </span>
                            <span className="text-2xl font-bold text-blue-400">
                                {equippedItemLevel}
                            </span>
                            {averageItemLevel &&
                                averageItemLevel !== equippedItemLevel && (
                                    <span className="text-xs text-muted-foreground">
                                        {averageItemLevel} bag
                                    </span>
                                )}
                        </div>
                    </div>
                </div>
            )}
            <Tabs
                value={activeTab ?? undefined}
                onValueChange={setUserSelectedTab}
                className="w-full h-full relative z-10 flex flex-col"
            >
                <TabsList className="flex justify-start gap-2 mb-3 bg-transparent h-auto p-0 shrink-0">
                    {blizzard && (
                        <TabsTrigger
                            value="blizzard"
                            className="group relative flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/30 transition-all duration-200 hover:bg-muted/60 hover:border-border data-[state=active]:bg-linear-to-br data-[state=active]:from-amber-500/10 data-[state=active]:to-orange-500/10 data-[state=active]:border-amber-500/50 data-[state=active]:shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                        >
                            <div className="relative">
                                <div className="absolute -inset-1 rounded-full bg-linear-to-br from-amber-500/20 to-orange-500/20 opacity-0 group-data-[state=active]:opacity-100 blur-sm transition-opacity" />
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
                            className="group relative flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/30 transition-all duration-200 hover:bg-muted/60 hover:border-border data-[state=active]:bg-linear-to-br data-[state=active]:from-blue-500/10 data-[state=active]:to-cyan-500/10 data-[state=active]:border-blue-500/50 data-[state=active]:shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                        >
                            <div className="relative">
                                <div className="absolute -inset-1 rounded-full bg-linear-to-br from-blue-500/20 to-cyan-500/20 opacity-0 group-data-[state=active]:opacity-100 blur-sm transition-opacity" />
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
                        <BlizzardData
                            data={blizzard}
                            tiersetInfo={droptimizer?.tiersetInfo}
                        />
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

import { CURRENT_CATALYST_CHARGE_ID, CURRENT_SEASON } from "@/shared/consts/wow.consts"
import { getUnixTimestamp } from "@/shared/libs/date/date-utils"
import {
    compareGearItem,
    gearAreTheSame,
    getItemTrack,
} from "@/shared/libs/items/item-bonus-utils"
import { equippedSlotToSlot } from "@/shared/libs/items/item-slot-utils"
import { getClassSpecsForRole } from "@/shared/libs/spec-parser/spec-utils"
import type { CharacterRaiderio } from "@/shared/schemas/raiderio.schemas"
import { tierSetBonusSchema } from "@/shared/schemas/wow.schemas"
import {
    DroptimizerWarn,
    RaiderioWarn,
    WowAuditWarn,
    type BisList,
    type BossWithItems,
    type Character,
    type CharacterWowAudit,
    type CharAssignmentHighlights,
    type CharAssignmentInfo,
    type Droptimizer,
    type DroptimizerCurrency,
    type DroptimizerUpgrade,
    type GearItem,
    type Item,
    type Loot,
    type LootWithAssigned,
    type LootWithItem,
    type SimC,
    type TierSetBonus,
    type WowClass,
    type WowItemSlotKey,
    type WowRaidDifficulty,
    type WowSpec,
} from "@/shared/types/types"
import { match } from "ts-pattern"

export const getLatestSyncDate = (
    charDroptimizers: Droptimizer[],
    charWowAudit: CharacterWowAudit | null,
    charRaiderio: CharacterRaiderio | null,
    simc: SimC | null
): number | null => {
    const droptimizerLastUpdate =
        charDroptimizers.length > 0
            ? Math.max(...charDroptimizers.map((c) => c.simInfo.date))
            : null

    const wowAuditLastUpdate = charWowAudit?.blizzardLastModifiedUnixTs ?? null
    const raiderioLastUpdate = charRaiderio?.itemUpdateAt ?? null
    const simcLastUpdate = simc?.dateGenerated ?? null

    const latestSyncDate = Math.max(
        droptimizerLastUpdate ?? -1,
        wowAuditLastUpdate ?? -1,
        raiderioLastUpdate ?? -1,
        simcLastUpdate ?? -1
    )

    return latestSyncDate === -1 ? null : latestSyncDate
}

export const parseDroptimizerWarn = (
    charDroptimizers: Droptimizer[],
    charAssignedLoots: Loot[]
): DroptimizerWarn => {
    if (charDroptimizers.length === 0) {
        return DroptimizerWarn.NotImported
    }

    const lastSimUnixTs = Math.max(...charDroptimizers.map((c) => c.simInfo.date))
    const dayInSeconds = 24 * 60 * 60
    const currentUnixTs = getUnixTimestamp()

    if (charAssignedLoots.length > 0 || currentUnixTs - lastSimUnixTs > dayInSeconds) {
        return DroptimizerWarn.Outdated
    }

    return DroptimizerWarn.None
}

export const parseWowAuditWarn = (
    wowAuditData: CharacterWowAudit | null
): WowAuditWarn => {
    if (!wowAuditData) {
        return WowAuditWarn.NotTracked
    }

    const lastSyncUnixTs = wowAuditData.wowauditLastModifiedUnixTs
    const dayInSeconds = 24 * 60 * 60
    const currentUnixTs = getUnixTimestamp()

    if (currentUnixTs - lastSyncUnixTs > dayInSeconds) {
        return WowAuditWarn.Outdated
    }

    return WowAuditWarn.None
}

export const parseRaiderioWarn = (
    raiderioData: CharacterRaiderio | null
): RaiderioWarn => {
    if (!raiderioData) {
        return RaiderioWarn.NotTracked
    }

    const lastSyncUnixTs = raiderioData.p1SyncAt
    const dayInSeconds = 24 * 60 * 60
    const currentUnixTs = getUnixTimestamp()

    if (currentUnixTs - lastSyncUnixTs > dayInSeconds) {
        return RaiderioWarn.Outdated
    }

    return RaiderioWarn.None
}

export const parseBestItemInSlot = (
    slotKey: WowItemSlotKey,
    charDroptimizers: Droptimizer[],
    charAssignedLoot: Loot[],
    charWowAudit: CharacterWowAudit | null,
    charRaiderio: CharacterRaiderio | null
): GearItem[] => {
    if (slotKey === "omni") {
        return [
            ...parseBestItemInSlot(
                "head",
                charDroptimizers,
                charAssignedLoot,
                charWowAudit,
                charRaiderio
            ),
            ...parseBestItemInSlot(
                "shoulder",
                charDroptimizers,
                charAssignedLoot,
                charWowAudit,
                charRaiderio
            ),
            ...parseBestItemInSlot(
                "chest",
                charDroptimizers,
                charAssignedLoot,
                charWowAudit,
                charRaiderio
            ),
            ...parseBestItemInSlot(
                "hands",
                charDroptimizers,
                charAssignedLoot,
                charWowAudit,
                charRaiderio
            ),
            ...parseBestItemInSlot(
                "legs",
                charDroptimizers,
                charAssignedLoot,
                charWowAudit,
                charRaiderio
            ),
        ]
    }

    const allItems: GearItem[] = [
        ...charDroptimizers.flatMap((d) => d.itemsEquipped),
        ...charDroptimizers.flatMap((d) => d.itemsInBag),
        ...charAssignedLoot.map((l) => l.gearItem),
    ]

    if (charWowAudit) {
        const wowAuditItems = charWowAudit.itemsEquipped.filter(
            (bg) => bg.item.slotKey === slotKey
        )
        if (wowAuditItems.length > 0) {
            allItems.push(...wowAuditItems)
        }
    }
    if (charRaiderio) {
        const raiderioItems = charRaiderio.itemsEquipped.filter(
            (bg) => bg.item.slotKey === slotKey
        )
        if (raiderioItems.length > 0) {
            allItems.push(...raiderioItems)
        }
    }

    const sortedItems = allItems
        .filter((gear) => gear.item.slotKey === slotKey)
        .sort((a, b) => compareGearItem(b, a))

    if (slotKey === "finger" || slotKey === "trinket") {
        const uniqueItems: GearItem[] = []
        const seenItemIds = new Set<number>()

        for (const item of sortedItems) {
            if (!seenItemIds.has(item.item.id)) {
                uniqueItems.push(item)
                seenItemIds.add(item.item.id)
            }
            if (uniqueItems.length === 2) {
                break
            }
        }
        return uniqueItems
    }

    return sortedItems.slice(0, 1)
}

export const parseTiersetInfo = (
    charDroptimizers: Droptimizer[],
    charAssignedLoots: Loot[],
    charWowAudit: CharacterWowAudit | null,
    charRaiderio: CharacterRaiderio | null,
    simc: SimC | null
): GearItem[] => {
    const lastDroptWithTierInfo = charDroptimizers
        .filter((c) => c.tiersetInfo.length > 0)
        .sort((a, b) => b.simInfo.date - a.simInfo.date)
        .at(0)

    const lastDroptimizerDate = lastDroptWithTierInfo?.simInfo.date ?? -1
    const simcDate = simc?.dateGenerated ?? -1

    const tiersetsInfo: GearItem[] = []
    const tiersetsInBag: GearItem[] = []
    const tiersetAssigned: GearItem[] = charAssignedLoots
        .map((l) => l.gearItem)
        .filter(
            (gi) =>
                gi.item.season === CURRENT_SEASON && (gi.item.tierset || gi.item.token)
        )

    if (lastDroptWithTierInfo && lastDroptimizerDate >= simcDate) {
        tiersetsInfo.push(
            ...lastDroptWithTierInfo.tiersetInfo.filter(
                (gi) => gi.item.season === CURRENT_SEASON
            )
        )
        tiersetsInBag.push(
            ...lastDroptWithTierInfo.itemsInBag.filter(
                (gi) =>
                    gi.item.season === CURRENT_SEASON &&
                    (gi.item.tierset || gi.item.token)
            )
        )
    }
    if (charWowAudit) {
        tiersetsInfo.push(
            ...charWowAudit.tiersetInfo.filter((gi) => gi.item.season === CURRENT_SEASON)
        )
    }
    if (charRaiderio) {
        tiersetsInfo.push(
            ...charRaiderio.itemsEquipped.filter(
                (gi) => gi.item.tierset && gi.item.season === CURRENT_SEASON
            )
        )
    }
    if (simc && simcDate >= lastDroptimizerDate) {
        tiersetsInfo.push(
            ...simc.itemsEquipped.filter(
                (gi) => gi.item.tierset && gi.item.season === CURRENT_SEASON
            )
        )
        tiersetsInBag.push(
            ...simc.itemsInBag.filter(
                (gi) =>
                    gi.item.season === CURRENT_SEASON &&
                    (gi.item.tierset || gi.item.token)
            )
        )
    }

    const allItems: GearItem[] = [...tiersetsInfo, ...tiersetsInBag, ...tiersetAssigned]
    const maxItemLevelBySlot = new Map<WowItemSlotKey, GearItem>()

    allItems
        .filter((t) => t.item.slotKey !== "omni")
        .forEach((gear) => {
            const existingGear = maxItemLevelBySlot.get(gear.item.slotKey)
            if (!existingGear) {
                maxItemLevelBySlot.set(gear.item.slotKey, gear)
            } else {
                const compareRes = compareGearItem(gear, existingGear)
                const ilvlDiff = gear.itemLevel - existingGear.itemLevel
                if (compareRes > 0 || (compareRes === 0 && ilvlDiff > 0)) {
                    maxItemLevelBySlot.set(gear.item.slotKey, gear)
                }
            }
        })

    return [
        ...Array.from(maxItemLevelBySlot.values()),
        ...allItems.filter((t) => t.item.slotKey === "omni"),
    ]
}

export const parseCatalystCharge = (charDroptimizers: Droptimizer[]): number => {
    const lastDroptWithTierInfo = charDroptimizers
        .sort((a, b) => b.simInfo.date - a.simInfo.date)
        .at(0)
    if (lastDroptWithTierInfo) {
        const catalyst = lastDroptWithTierInfo.currencies.find(
            (c) => c.id === CURRENT_CATALYST_CHARGE_ID
        )
        return catalyst?.amount ?? 0
    }
    return 0
}

export const parseGreatVault = (
    droptimizers: Droptimizer[],
    simc: SimC | null
): GearItem[] => {
    const lastDroptimizer = droptimizers.sort(
        (a, b) => b.simInfo.date - a.simInfo.date
    )[0]
    const lastSimcDate = simc?.dateGenerated ?? -1

    if (simc && lastSimcDate > (lastDroptimizer?.simInfo.date ?? -1)) {
        return simc.weeklyChest
    }

    return lastDroptimizer?.weeklyChest ?? []
}

export const parseCurrencies = (
    droptimizers: Droptimizer[],
    simc: SimC | null
): DroptimizerCurrency[] => {
    const lastDroptimizer = droptimizers.sort(
        (a, b) => b.simInfo.date - a.simInfo.date
    )[0]
    const lastSimcDate = simc?.dateGenerated ?? -1

    if (simc && lastSimcDate > (lastDroptimizer?.simInfo.date ?? -1)) {
        return simc.currencies
    }

    return lastDroptimizer?.currencies ?? []
}

export const parseLootBisSpecForChar = (
    bisList: BisList[],
    itemId: number,
    char: Character
): WowSpec[] => {
    const roleSpecIds = new Set(
        getClassSpecsForRole(char.class, char.role).map((s) => s.id)
    )
    const specs = getClassSpecsForRole(char.class, char.role)
    return bisList
        .filter((b) => b.itemId === itemId)
        .flatMap((b) => b.specIds)
        .filter((specId) => roleSpecIds.has(specId))
        .map((specId) => specs.find((s) => s.id === specId))
        .filter((spec): spec is WowSpec => spec !== undefined)
}

export const parseDroptimizersInfo = (
    lootItem: Item,
    raidDiff: WowRaidDifficulty,
    droptimizers: Droptimizer[]
): {
    upgrade: DroptimizerUpgrade | null
    itemEquipped: GearItem
    droptimizer: Droptimizer
}[] => {
    const filteredDropt = droptimizers.filter((d) => d.raidInfo.difficulty === raidDiff)

    if (lootItem.slotKey === "omni") {
        return filteredDropt
            .map((droptimizer) => {
                const upgrades = droptimizer.upgrades
                    .filter((up) => up.tiersetItemId)
                    .sort((a, b) => b.dps - a.dps)
                const bestUpgrade = upgrades[0]
                if (bestUpgrade) {
                    const itemEquipped = droptimizer.itemsEquipped.find(
                        (gearItem) => gearItem.equippedInSlot === bestUpgrade.slot
                    )
                    if (itemEquipped) {
                        return { upgrade: bestUpgrade, itemEquipped, droptimizer }
                    }
                }
                return null
            })
            .filter(
                (
                    dropt
                ): dropt is {
                    upgrade: DroptimizerUpgrade
                    itemEquipped: GearItem
                    droptimizer: Droptimizer
                } => dropt !== null
            )
            .sort((a, b) => b.upgrade.dps - a.upgrade.dps)
    }

    return filteredDropt
        .map((droptimizer) => {
            const upgrade =
                droptimizer.upgrades.find(({ item }) => item.id === lootItem.id) ?? null

            const itemEquipped = upgrade
                ? droptimizer.itemsEquipped.find(
                      (gearItem) => gearItem.equippedInSlot === upgrade.slot
                  )
                : droptimizer.itemsEquipped.find(
                      (gearItem) =>
                          gearItem.equippedInSlot &&
                          equippedSlotToSlot(gearItem.equippedInSlot) === lootItem.slotKey
                  )

            if (!itemEquipped) {
                return null
            }

            return { upgrade, itemEquipped, droptimizer }
        })
        .filter(
            (
                entry
            ): entry is {
                upgrade: DroptimizerUpgrade | null
                itemEquipped: GearItem
                droptimizer: Droptimizer
            } => entry !== null
        )
        .sort((a, b) => (b.upgrade?.dps ?? 0) - (a.upgrade?.dps ?? 0))
}

export const parseLootAlreadyGotIt = (
    loot: LootWithItem,
    wowClass: WowClass,
    charDroptimizers: Droptimizer[],
    charAssignedLoots: Loot[],
    charAuditData: CharacterWowAudit | null,
    charRaiderio: CharacterRaiderio | null,
    itemToTiersetMapping: { itemId: number; classId: number; tokenId: number }[]
): boolean => {
    if (loot.gearItem.item.slotKey === "omni") {
        return false
    }

    const lastDroptWithTierInfo = charDroptimizers
        .filter((c) => c.itemsInBag.length > 0)
        .sort((a, b) => b.simInfo.date - a.simInfo.date)
        .at(0)

    const availableGear: GearItem[] = [
        ...(lastDroptWithTierInfo?.itemsEquipped ?? []).filter(
            (gi) => gi.item.id === loot.item.id
        ),
        ...(lastDroptWithTierInfo?.itemsInBag ?? []).filter(
            (gi) => gi.item.id === loot.item.id
        ),
        ...charAssignedLoots.flatMap((l) =>
            l.gearItem.item.id === loot.item.id ? [l.gearItem] : []
        ),
        ...(charAuditData?.itemsEquipped ?? []).filter(
            (gi) => gi.item.id === loot.item.id
        ),
        ...(charRaiderio?.itemsEquipped ?? []).filter(
            (gi) => gi.item.id === loot.item.id
        ),
    ]

    if (loot.gearItem.item.token) {
        const tokenMapping = itemToTiersetMapping.find(
            (mapping) =>
                mapping.tokenId === loot.gearItem.item.id &&
                mapping.classId === wowClass.id
        )
        if (tokenMapping) {
            availableGear.push(
                ...(lastDroptWithTierInfo?.itemsEquipped ?? []).filter(
                    (gi) => gi.item.id === tokenMapping.itemId
                )
            )
            availableGear.push(
                ...(lastDroptWithTierInfo?.itemsInBag ?? []).filter(
                    (gi) => gi.item.id === tokenMapping.itemId
                )
            )
            availableGear.push(
                ...(charAuditData?.itemsEquipped ?? []).filter(
                    (gi) => gi.item.id === tokenMapping.itemId
                )
            )

            const convertedLoot: GearItem = {
                ...loot.gearItem,
                itemTrack: getItemTrack(loot.gearItem.itemLevel, loot.raidDifficulty),
                item: {
                    ...loot.item,
                    id: tokenMapping.itemId,
                },
            }
            const alreadyGotTierset = availableGear.some((gear) =>
                gearAreTheSame(convertedLoot, gear)
            )
            if (alreadyGotTierset) {
                return true
            }
        }
    }

    return availableGear.some((gear) => gearAreTheSame(loot.gearItem, gear))
}

const calculateTiersetCompletion = (
    loot: LootWithItem,
    currentTierset: GearItem[]
): TierSetBonus => {
    if (!loot.item.token) {
        return tierSetBonusSchema.enum.none
    }

    const isValidSlot =
        loot.item.slotKey === "omni" ||
        !currentTierset.some((t) => t.item.slotKey === loot.item.slotKey)

    if (!isValidSlot) {
        return tierSetBonusSchema.enum.none
    }

    return match<number, TierSetBonus>(currentTierset.length)
        .with(1, () => tierSetBonusSchema.enum["2p"])
        .with(3, () => tierSetBonusSchema.enum["4p"])
        .otherwise(() => tierSetBonusSchema.enum.none)
}

export const evalHighlightsAndScore = (
    loot: LootWithItem,
    charInfo: Omit<CharAssignmentInfo, "highlights">,
    maxDpsGain: number
): CharAssignmentHighlights => {
    const {
        bestItemsInSlot,
        bisForSpec,
        character,
        droptimizers,
        tierset,
        alreadyGotIt,
    } = charInfo

    const isMain = character.main

    const maxUpgrade = droptimizers
        .map((d) => d.upgrade?.dps ?? 0)
        .reduce((max, upgrade) => (upgrade > max ? upgrade : max), 0)

    let bestItemInSlot: GearItem | undefined
    if (loot.gearItem.item.slotKey === "omni") {
        bestItemInSlot = bestItemsInSlot.sort((a, b) => compareGearItem(a, b)).at(0)
    } else if (bestItemsInSlot.length === 2) {
        bestItemInSlot = bestItemsInSlot.sort((a, b) => compareGearItem(a, b)).at(0)
    } else {
        bestItemInSlot = bestItemsInSlot.at(0)
    }

    const ilvlDiff = bestItemInSlot
        ? loot.gearItem.itemLevel - bestItemInSlot.itemLevel
        : -999

    const isTrackUpgrade = bestItemInSlot
        ? compareGearItem(loot.gearItem, bestItemInSlot) > 0
        : false

    const res: Omit<CharAssignmentHighlights, "score"> = {
        isMain,
        dpsGain: maxUpgrade,
        lootEnableTiersetBonus: calculateTiersetCompletion(loot, tierset),
        gearIsBis: bisForSpec.length > 0,
        ilvlDiff,
        isTrackUpgrade,
        alreadyGotIt,
    }

    return { ...res, score: evalScore(res, maxDpsGain) }
}

export const evalScore = (
    highlights: Omit<CharAssignmentHighlights, "score">,
    maxDdpsGain: number
): number => {
    const { dpsGain, gearIsBis, lootEnableTiersetBonus, isTrackUpgrade, alreadyGotIt } =
        highlights

    if (alreadyGotIt) {
        return 0
    }

    const normalizedDps = dpsGain > 0 ? dpsGain / maxDdpsGain : 0.01
    const bonusBisScore = gearIsBis ? 0 : 0
    const tierSetMultiplier = match(lootEnableTiersetBonus)
        .with(tierSetBonusSchema.enum["4p"], () => 4)
        .with(tierSetBonusSchema.enum["2p"], () => 2)
        .otherwise(() => 1)

    const trackMultiplier = isTrackUpgrade ? 1.1 : 1

    const baseScore = normalizedDps * tierSetMultiplier * trackMultiplier
    const score = baseScore + bonusBisScore

    const formattedScore = Math.round(score * 100)

    return formattedScore
}

// CSV Export Utilities

export const generateLootFilename = (
    sessions: { id: string; name: string }[],
    selectedSessionIds: Set<string>,
    suffix: string
): string => {
    return `${sessions
        .filter((session) => selectedSessionIds.has(session.id))
        .map((session) => session.name)
        .join("-")}-${suffix}.csv`
}

export const prepareLootData = (
    loots: LootWithAssigned[],
    encounterList: BossWithItems[]
) => {
    return loots
        .filter((loot) => loot.assignedCharacter !== null)
        .map((loot) => ({
            Difficoltà: loot.raidDifficulty,
            Boss:
                encounterList
                    .find((boss) =>
                        boss.items.find((item) => item.id === loot.gearItem.item.id)
                    )
                    ?.name.replaceAll(",", " ") ?? "",
            Item: loot.gearItem.item.name,
            Livello: loot.gearItem.itemLevel,
            Slot: loot.gearItem.item.slotKey
                .replaceAll("_", " ")
                .replace(/\b\w/g, (char) => char.toUpperCase()),
            Character: loot.assignedCharacter?.name ?? "",
        }))
        .sort((a, b) => {
            if (a.Character < b.Character) {
                return -1
            }
            if (a.Character > b.Character) {
                return 1
            }
            if (a.Difficoltà < b.Difficoltà) {
                return -1
            }
            if (a.Difficoltà > b.Difficoltà) {
                return 1
            }
            return 0
        })
}

export const prepareStatsData = (
    loots: LootWithAssigned[],
    encounterList: BossWithItems[]
) => {
    // Group loots by Boss and Difficulty
    const groupedData: Record<
        string,
        { RaidDpsGain: number; TwoPiecesClosed: string[]; FourPiecesClosed: string[] }
    > = {}

    loots.forEach((loot) => {
        if (!loot.assignedCharacter) {
            return
        }

        const bossName =
            encounterList
                .find((boss) =>
                    boss.items.find((item) => item.id === loot.gearItem.item.id)
                )
                ?.name.replaceAll(",", " ") ?? "Unknown Boss"

        const difficulty = loot.raidDifficulty

        const key = `${bossName}#${difficulty}`

        groupedData[key] ??= {
            RaidDpsGain: 0,
            TwoPiecesClosed: [],
            FourPiecesClosed: [],
        }

        // Aggregate RaidDpsGain
        groupedData[key].RaidDpsGain += loot.assignedHighlights?.dpsGain ?? 0

        // Concatenate names for TwoPiecesClosed
        if (loot.assignedHighlights?.lootEnableTiersetBonus === "2p") {
            groupedData[key].TwoPiecesClosed.push(loot.assignedCharacter.name)
        }
        // Concatenate names for FourPiecesClosed
        if (loot.assignedHighlights?.lootEnableTiersetBonus === "4p") {
            groupedData[key].FourPiecesClosed.push(loot.assignedCharacter.name)
        }
    })

    // Transform grouped data into the desired format
    return Object.entries(groupedData).map(([key, value]) => {
        const [Boss, Difficoltà] = key.split("#")
        return {
            Boss,
            Difficoltà,
            RaidDpsGain: value.RaidDpsGain,
            TwoPiecesClosed: value.TwoPiecesClosed.join("|"),
            FourPiecesClosed: value.FourPiecesClosed.join("|"),
        }
    })
}

export const convertToCSV = (data: Record<string, unknown>[]): string => {
    if (data.length === 0) {
        return ""
    }

    const firstRow = data[0]
    if (!firstRow) {
        return ""
    }

    const headers = Object.keys(firstRow)
    const headerRow = headers.map((h) => `"${h}"`).join(",")
    const rows = data.map((row) =>
        headers.map((h) => `"${String(row[h]).replace(/"/g, '""')}"`).join(",")
    )

    return [headerRow, ...rows].join("\n")
}

export const downloadCSV = (data: string, filename: string): void => {
    const blob = new Blob([data], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

import { match } from "ts-pattern"
import { getUnixTimestamp } from "@/shared/libs/date-utils"
import {
    compareGearItem,
    gearAreTheSame,
    getItemTrack,
} from "@/shared/libs/items/item-bonus-utils"
import { equippedSlotToSlot, formatWowSlotKey } from "@/shared/libs/items/item-slot-utils"
import { CURRENT_CATALYST_CHARGE_ID, CURRENT_SEASON } from "@/shared/libs/season-config"
import { getClassSpecsForRole } from "@/shared/libs/spec-parser/spec-utils"
import type { BisList } from "@/shared/models/bis-list.models"
import type { CharacterBlizzard } from "@/shared/models/blizzard.models"
import type { BossWithItems } from "@/shared/models/boss.models"
import type { Character } from "@/shared/models/character.models"
import type { GearItem, Item } from "@/shared/models/item.models"
import type {
    CharAssignmentHighlights,
    Loot,
    LootWithAssigned,
    LootWithItem,
} from "@/shared/models/loot.models"
import type {
    Droptimizer,
    DroptimizerUpgrade,
    SimC,
} from "@/shared/models/simulation.models"
import {
    tierSetBonusSchema,
    type TierSetBonus,
    type WowItemSlotKey,
    type WowRaidDifficulty,
} from "@/shared/models/wow.models"
import {
    BLIZZARD_WARN,
    type BlizzardWarn,
    DROPTIMIZER_WARN,
    type DroptimizerWarn,
    type CharAssignmentInfo,
    type WowClass,
    type WowSpec,
} from "@/shared/types"

export const getLatestSyncDate = (
    charDroptimizers: Droptimizer[],
    charBlizzard: CharacterBlizzard | null,
    simc: SimC | null
): number | null => {
    const droptimizerLastUpdate =
        charDroptimizers.length > 0
            ? Math.max(...charDroptimizers.map((c) => c.simInfo.date))
            : null

    const blizzardLastUpdate = charBlizzard?.syncedAt ?? null
    const simcLastUpdate = simc?.dateGenerated ?? null

    const latestSyncDate = Math.max(
        droptimizerLastUpdate ?? -1,
        blizzardLastUpdate ?? -1,
        simcLastUpdate ?? -1
    )

    return latestSyncDate === -1 ? null : latestSyncDate
}

export const parseDroptimizerWarn = (
    charDroptimizers: Droptimizer[],
    charAssignedLoots: Loot[]
): DroptimizerWarn => {
    if (charDroptimizers.length === 0) {
        return DROPTIMIZER_WARN.NotImported
    }

    const lastSimUnixTs = Math.max(...charDroptimizers.map((c) => c.simInfo.date))
    const dayInSeconds = 24 * 60 * 60
    const currentUnixTs = getUnixTimestamp()

    if (charAssignedLoots.length > 0 || currentUnixTs - lastSimUnixTs > dayInSeconds) {
        return DROPTIMIZER_WARN.Outdated
    }

    return DROPTIMIZER_WARN.None
}

export const parseBlizzardWarn = (
    blizzardData: CharacterBlizzard | null
): BlizzardWarn => {
    if (!blizzardData) {
        return BLIZZARD_WARN.NotTracked
    }

    const lastSyncUnixTs = blizzardData.syncedAt
    const dayInSeconds = 24 * 60 * 60
    const currentUnixTs = getUnixTimestamp()

    if (currentUnixTs - lastSyncUnixTs > dayInSeconds) {
        return BLIZZARD_WARN.Outdated
    }

    return BLIZZARD_WARN.None
}

export const parseBestItemInSlot = (
    slotKey: WowItemSlotKey,
    charDroptimizers: Droptimizer[],
    charAssignedLoot: Loot[],
    charBlizzard: CharacterBlizzard | null
): GearItem[] => {
    if (slotKey === "omni") {
        return [
            ...parseBestItemInSlot(
                "head",
                charDroptimizers,
                charAssignedLoot,
                charBlizzard
            ),
            ...parseBestItemInSlot(
                "shoulder",
                charDroptimizers,
                charAssignedLoot,
                charBlizzard
            ),
            ...parseBestItemInSlot(
                "chest",
                charDroptimizers,
                charAssignedLoot,
                charBlizzard
            ),
            ...parseBestItemInSlot(
                "hands",
                charDroptimizers,
                charAssignedLoot,
                charBlizzard
            ),
            ...parseBestItemInSlot(
                "legs",
                charDroptimizers,
                charAssignedLoot,
                charBlizzard
            ),
        ]
    }

    const allItems: GearItem[] = [
        ...charDroptimizers.flatMap((d) => d.itemsEquipped),
        ...charDroptimizers.flatMap((d) => d.itemsInBag),
        ...charAssignedLoot.map((l) => l.gearItem),
    ]

    if (charBlizzard) {
        const blizzardItems = charBlizzard.itemsEquipped.filter(
            (bg) => bg.item.slotKey === slotKey
        )
        if (blizzardItems.length > 0) {
            allItems.push(...blizzardItems)
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
    charBlizzard: CharacterBlizzard | null,
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
    if (charBlizzard) {
        tiersetsInfo.push(
            ...charBlizzard.itemsEquipped.filter(
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
    charBlizzard: CharacterBlizzard | null,
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
        ...(charBlizzard?.itemsEquipped ?? []).filter(
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
                ...(charBlizzard?.itemsEquipped ?? []).filter(
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

const evalScore = (
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
            Slot: formatWowSlotKey(loot.gearItem.item.slotKey),
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

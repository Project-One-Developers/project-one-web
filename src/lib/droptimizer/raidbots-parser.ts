import { CURRENT_SEASON } from "@/shared/consts/wow.consts"
import { getUnixTimestamp } from "@/shared/libs/date/date-utils"
import {
    applyItemTrackByIlvlAndDiff,
    evalRealSeason,
    gearAreTheSame,
    parseItemTrack,
} from "@/shared/libs/items/item-bonus-utils"
import { equippedSlotToSlot } from "@/shared/libs/items/item-slot-utils"
import { raidbotsURLSchema } from "@/shared/schemas/simulations.schemas"
import {
    wowItemEquippedSlotKeySchema,
    wowRaidDiffSchema,
} from "@/shared/schemas/wow.schemas"
import type {
    GearItem,
    Item,
    ItemTrack,
    NewDroptimizer,
    NewDroptimizerUpgrade,
    RaidbotsURL,
    WowClassName,
    WowItemEquippedSlotKey,
    WowRaidDifficulty,
} from "@/shared/types/types"
import {
    getItems,
    getItemToCatalystMapping,
    getItemToTiersetMapping,
} from "@/db/repositories/items"
import { z } from "zod"
import {
    droptimizerEquippedItemsSchema,
    RaidbotJson,
    raidbotJsonSchema,
} from "./raidbots.schemas"
import {
    parseBagGearsFromSimc,
    parseCatalystFromSimc,
    parseGreatVaultFromSimc,
    parseTiersets,
} from "./simc-parser"

export const fetchDroptimizerFromURL = async (url: string): Promise<NewDroptimizer> => {
    const raidbotsURL = raidbotsURLSchema.parse(url)
    const jsonData = await fetchRaidbotsData(raidbotsURL)
    const parsedJson = parseRaidbotsData(jsonData)

    const droptimizer = await convertJsonToDroptimizer(url, parsedJson)

    return droptimizer
}

export const fetchRaidbotsData = async (url: RaidbotsURL): Promise<unknown> => {
    const responseJson = await fetch(`${url}/data.json`)
    if (!responseJson.ok) {
        throw new Error(
            `Failed to fetch JSON data: ${responseJson.status} ${responseJson.statusText}`
        )
    }
    return await responseJson.json()
}

export const parseRaidbotsData = (jsonData: any): RaidbotJson => {
    if (jsonData?.simbot?.publicTitle === "Top Gear") {
        throw new Error(
            `Skipping invalid droptimizer for ${jsonData.simbot.player} (Top Gear): ${jsonData.simbot.parentSimId}`
        )
    }
    return raidbotJsonSchema.parse(jsonData)
}

const parseUpgrades = async (
    raidDiff: WowRaidDifficulty,
    upgrades: {
        dps: number
        encounterId: number
        itemId: number
        ilvl: number
        slot: WowItemEquippedSlotKey
    }[],
    itemsInBag: GearItem[],
    itemsEquipped: GearItem[]
): Promise<NewDroptimizerUpgrade[]> => {
    const itemToTiersetMapping = await getItemToTiersetMapping()
    const itemToCatalystMapping = await getItemToCatalystMapping()

    // One Armed Bandit workaround for Best-In-Slots item
    const bestInSlotUpgrades = upgrades.find(
        (up) => up.itemId === 232526 || up.itemId === 232805
    )
    if (bestInSlotUpgrades != null) {
        console.log(
            "parseUpgrades: applying workaround for Best-in-Slots item id 232526 or 232805"
        )
        const otherId = bestInSlotUpgrades.itemId === 232526 ? 232805 : 232526
        const newUprade = { ...bestInSlotUpgrades, itemId: otherId }
        upgrades.push(newUprade)
    }

    const charItems = [...itemsInBag, ...itemsEquipped]

    const upgradesMap = upgrades
        // filter out item without dps gain
        .filter((item) => item.dps > 0)
        // filter out item already in bags or equipped
        .filter((item) => {
            const bonusIds: number[] = []
            const itemTrack = applyItemTrackByIlvlAndDiff(bonusIds, item.ilvl, raidDiff)
            const upgradeGear: GearItem = {
                item: {
                    id: item.itemId,
                    slotKey: equippedSlotToSlot(item.slot),
                    season: CURRENT_SEASON,
                    name: "", // not needed for comparison
                    armorType: null, // not needed for comparison
                    token: false, // not needed for comparison
                    tierset: false, // not needed for comparison
                    boe: false, // not needed for comparison,
                    veryRare: false, // not needed for comparison
                    iconName: "", // not needed for comparison
                    specIds: null, // not needed for comparison
                },
                source: "bag",
                itemLevel: item.ilvl,
                bonusIds: bonusIds,
                itemTrack: itemTrack,
                gemIds: null,
                enchantIds: null,
            }
            return charItems.every((bagGear) => !gearAreTheSame(bagGear, upgradeGear))
        })
        // remap itemid to tierset & catalyst
        .map((up) => {
            const tiersetMapping = itemToTiersetMapping?.find(
                (i) => i.itemId === up.itemId
            )

            const catalystMapping = !tiersetMapping
                ? itemToCatalystMapping?.find(
                      (i) =>
                          i.catalyzedItemId === up.itemId &&
                          i.encounterId === up.encounterId
                  )
                : null

            const res: NewDroptimizerUpgrade = {
                itemId: up.itemId,
                slot: up.slot,
                dps: up.dps,
                ilvl: up.ilvl,
                catalyzedItemId: null,
                tiersetItemId: null,
                ...(tiersetMapping && {
                    itemId: tiersetMapping.tokenId,
                    tiersetItemId: tiersetMapping.itemId,
                }),
                ...(catalystMapping && {
                    itemId: catalystMapping.itemId,
                    catalyzedItemId: catalystMapping.catalyzedItemId,
                }),
            }

            return res
        })
        // for a given itemid upgrade, keep the max dps gain
        .reduce((acc, item) => {
            const existingItem = acc.get(item.itemId)
            if (!existingItem || item.dps > existingItem.dps) {
                acc.set(item.itemId, item)
            }
            return acc
        }, new Map<number, NewDroptimizerUpgrade>())

    return Array.from(upgradesMap.values())
}

export const convertJsonToDroptimizer = async (
    url: string,
    data: RaidbotJson
): Promise<NewDroptimizer> => {
    // transform
    const raidId = Number(data.sim.profilesets.results[0].name.split("/")[0])
    const raidDiff: WowRaidDifficulty = wowRaidDiffSchema.parse(
        data.simbot.publicTitle.split("•")[2].replaceAll(" ", "")
    )

    const dpsMean =
        data.sim.players[0].specialization.toLowerCase() !== "augmentation evoker"
            ? data.sim.players[0].collected_data.dps.mean
            : data.sim.statistics.raid_dps.mean // augmentation evoker dps mean is the whole raid dps

    const upgrades = data.sim.profilesets.results.map((item) => ({
        dps: Math.round(item.mean - dpsMean),
        encounterId: Number(item.name.split("/")[1]),
        itemId: Number(item.name.split("/")[3]),
        ilvl: Number(item.name.split("/")[4]),
        slot: wowItemEquippedSlotKeySchema.parse(item.name.split("/")[6]),
    }))
    const charInfo = {
        name: data.simbot.meta.rawFormData.character.name,
        server: data.simbot.meta.rawFormData.character.realm
            .toLowerCase()
            .replaceAll("_", "-")
            .replaceAll(" ", "-")
            .replaceAll("'", ""),
        class: data.simbot.meta.rawFormData.character.talentLoadouts[0].talents
            .className as WowClassName,
        classId: data.simbot.meta.rawFormData.character.talentLoadouts[0].talents.classId,
        spec: data.simbot.meta.rawFormData.character.talentLoadouts[0].talents.specName,
        specId: data.simbot.meta.rawFormData.character.talentLoadouts[0].talents.specId,
        talents: data.sim.players[0].talents,
    }

    const itemsEquipped = await parseEquippedGear(
        data.simbot.meta.rawFormData.droptimizer.equipped
    )
    const itemsInBag = await parseBagGearsFromSimc(data.simbot.meta.rawFormData.text)

    if (itemsInBag.length === 0) {
        throw new Error("No items found in bags: " + url)
    }

    // Merge currencies from rawFormData and parseCatalystFromSimc
    const upgradeCurrencies =
        data.simbot.meta.rawFormData.character.upgradeCurrencies ?? []
    const catalystCurrencies = await parseCatalystFromSimc(
        data.simbot.meta.rawFormData.text
    )
    const mergedCurrencies = [...upgradeCurrencies, ...catalystCurrencies]

    return {
        ak: `${raidId},${raidDiff},${charInfo.name},${charInfo.server},${charInfo.spec},${charInfo.class}`,
        url,
        charInfo,
        raidInfo: {
            id: raidId,
            difficulty: raidDiff,
        },
        simInfo: {
            date: data.timestamp,
            fightstyle: data.sim.options.fight_style,
            duration: data.sim.options.max_time,
            nTargets: data.sim.options.desired_targets,
            upgradeEquipped: data.simbot.meta.rawFormData.droptimizer.upgradeEquipped,
        },
        dateImported: getUnixTimestamp(),
        upgrades: await parseUpgrades(raidDiff, upgrades, itemsInBag, itemsEquipped),
        currencies: mergedCurrencies,
        weeklyChest: await parseGreatVaultFromSimc(data.simbot.meta.rawFormData.text),
        itemsAverageItemLevel:
            data.simbot.meta.rawFormData.character.items.averageItemLevelEquipped ?? null,
        itemsAverageItemLevelEquipped:
            data.simbot.meta.rawFormData.character.items.averageItemLevelEquipped ?? null,
        itemsEquipped,
        itemsInBag,
        tiersetInfo: await parseTiersets(itemsEquipped, itemsInBag),
    }
}

export const parseEquippedGear = async (
    droptEquipped: z.infer<typeof droptimizerEquippedItemsSchema>
): Promise<GearItem[]> => {
    const itemsInDb: Item[] = await getItems()
    const res: GearItem[] = []

    for (const [slot, droptGearItem] of Object.entries(droptEquipped)) {
        if (!droptGearItem.bonus_id) {
            throw new Error(
                "[error] parseEquippedGear: found equipped item without bonus_id " +
                    droptGearItem.id +
                    " - https://www.wowhead.com/item=" +
                    droptGearItem.id
            )
        }
        const bonusIds = droptGearItem.bonus_id.split("/").map(Number)
        const wowItem = itemsInDb.find((i) => i.id === droptGearItem.id)
        if (wowItem == null) {
            console.log(
                "[error] parseEquippedGear: skipping equipped item not in db: " +
                    droptGearItem.id +
                    " - https://www.wowhead.com/item=" +
                    droptGearItem.id +
                    "?bonus=" +
                    bonusIds.join(":")
            )
            continue
        }

        let itemTrack: ItemTrack | null = null
        if (
            wowItem.sourceType !== "profession593" &&
            !wowItem.sourceType.startsWith("special")
        ) {
            itemTrack = parseItemTrack(bonusIds)
            if (!itemTrack) {
                console.log(
                    "[warn] parseEquippedGear: found equipped item without item track " +
                        droptGearItem.id +
                        " - https://www.wowhead.com/item=" +
                        droptGearItem.id +
                        "?bonus=" +
                        bonusIds.join(":")
                )
            }
        }

        let realSlot = slot
        if (slot === "mainHand") realSlot = "main_hand"
        else if (slot === "offHand") realSlot = "off_hand"

        res.push({
            item: {
                id: wowItem.id,
                name: wowItem.name,
                armorType: wowItem.armorType,
                slotKey: wowItem.slotKey,
                token: wowItem.token,
                tierset: wowItem.tierset,
                boe: wowItem.boe,
                veryRare: wowItem.veryRare,
                iconName: wowItem.iconName,
                season: evalRealSeason(wowItem, droptGearItem.itemLevel),
                specIds: wowItem.specIds,
            },
            source: "equipped",
            equippedInSlot: wowItemEquippedSlotKeySchema.parse(realSlot),
            itemLevel: droptGearItem.itemLevel,
            bonusIds: droptGearItem.bonus_id ? bonusIds : null,
            enchantIds: null,
            gemIds: null,
            itemTrack: itemTrack,
        })
    }
    return res
}

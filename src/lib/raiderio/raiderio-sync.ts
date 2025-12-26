import { logger } from "@/lib/logger"
import { s } from "@/lib/safe-stringify"
import { getUnixTimestamp } from "@/shared/libs/date/date-utils"
import { evalRealSeason, parseItemTrack } from "@/shared/libs/items/item-bonus-utils"
import { CharacterRaiderio } from "@/shared/schemas/raiderio.schemas"
import {
    raiderioResponseSchema,
    type RaiderioItems,
    type RaiderioResponse,
} from "@/shared/schemas/raiderio-response.schemas"
import type { GearItem, Item, WowItemEquippedSlotKey } from "@/shared/types/types"
import { getItems } from "@/db/repositories/items"

export async function fetchCharacterRaidProgress(
    characterName: string,
    realm: string
): Promise<RaiderioResponse> {
    const url = `https://raider.io/api/characters/eu/${realm}/${characterName}?season=season-tww-3&tier=34`

    const response = await fetch(url)

    if (!response.ok) {
        const errorMessage = `Failed to fetch ${characterName} from ${realm}: ${s(response.status)} ${response.statusText}`
        logger.error("Raiderio", errorMessage, {
            url,
            character: characterName,
            realm,
            status: response.status,
            statusText: response.statusText,
        })

        throw new Error(errorMessage)
    }

    const data: unknown = await response.json()

    return raiderioResponseSchema.parse(data)
}

let itemsInDb: Item[] | null = null

export async function parseRaiderioData(
    name: string,
    realm: string,
    raiderioCharData: RaiderioResponse
): Promise<CharacterRaiderio> {
    itemsInDb ??= await getItems()

    const res: CharacterRaiderio = {
        name: name,
        realm: realm,
        race: raiderioCharData.characterDetails.character.race.name,
        characterId: raiderioCharData.characterDetails.character.id,
        p1SyncAt: getUnixTimestamp(),
        loggedOutAt: Math.floor(
            new Date(raiderioCharData.characterDetails.meta.loggedOutAt).getTime() / 1000
        ),
        averageItemLevel:
            raiderioCharData.characterDetails.itemDetails.item_level_equipped,
        itemUpdateAt: Math.floor(
            new Date(raiderioCharData.characterDetails.itemDetails.updated_at).getTime() /
                1000
        ),
        itemsEquipped: createEquippedInfo(
            raiderioCharData.characterDetails.itemDetails.items
        ),
        progress: raiderioCharData.characterRaidProgress,
    }

    return res
}

function createEquippedInfo(itemsEquipped: RaiderioItems): GearItem[] {
    const res: GearItem[] = []

    const slots: { key: keyof RaiderioItems; slotKey: WowItemEquippedSlotKey }[] = [
        { key: "head", slotKey: "head" },
        { key: "neck", slotKey: "neck" },
        { key: "shoulder", slotKey: "shoulder" },
        { key: "back", slotKey: "back" },
        { key: "chest", slotKey: "chest" },
        { key: "wrist", slotKey: "wrist" },
        { key: "hands", slotKey: "hands" },
        { key: "waist", slotKey: "waist" },
        { key: "legs", slotKey: "legs" },
        { key: "feet", slotKey: "feet" },
        { key: "finger1", slotKey: "finger1" },
        { key: "finger2", slotKey: "finger2" },
        { key: "trinket1", slotKey: "trinket1" },
        { key: "trinket2", slotKey: "trinket2" },
        { key: "mainhand", slotKey: "main_hand" },
        { key: "offhand", slotKey: "off_hand" },
    ]

    for (const { key, slotKey } of slots) {
        const item = itemsEquipped[key]
        if (item) {
            const gearPiece = createGearPiece(
                item.item_id,
                item.item_level,
                item.bonuses,
                item.gems,
                item.enchants,
                slotKey
            )
            if (gearPiece) {
                res.push(gearPiece)
            }
        }
    }

    return res
}

function createGearPiece(
    itemId: number | undefined,
    ilvl: number | undefined,
    bonusIds: number[] | undefined,
    gemIds: number[] | undefined,
    enchantIds: number[] | undefined,
    equippedInSlot: WowItemEquippedSlotKey
): GearItem | null {
    if (!itemId || !ilvl || !itemsInDb) {
        return null
    }
    const wowItem = itemsInDb.find((i) => i.id === itemId)
    if (!wowItem) {
        logger.debug(
            "Raiderio",
            `createGearPiece: skipping equipped item in ${equippedInSlot} not in db: ${s(
                itemId
            )} https://www.wowhead.com/item=${s(itemId)}`
        )
        return null
    }
    const res: GearItem = {
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
            season: evalRealSeason(wowItem, ilvl),
            specIds: wowItem.specIds,
        },
        source: "equipped",
        equippedInSlot: equippedInSlot,
        itemLevel: ilvl,
        bonusIds: bonusIds ?? null,
        itemTrack: bonusIds ? parseItemTrack(bonusIds) : null,
        gemIds: gemIds ?? null,
        enchantIds: enchantIds ?? null,
    }
    return res
}

// Reset items cache (useful for testing or forced refresh)
export function resetItemsCache(): void {
    itemsInDb = null
}

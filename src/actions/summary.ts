"use server"

import { keyBy } from "es-toolkit"
import { DateTime } from "luxon"
import { match, P } from "ts-pattern"
import { characterGameInfoRepo } from "@/db/repositories/character-game-info"
import { characterRepo } from "@/db/repositories/characters"
import { playerRepo } from "@/db/repositories/player.repo"
import type { CharacterGameInfoCompact } from "@/shared/models/character.model"
import type { GearItem } from "@/shared/models/item.model"
import {
    BlizzardWarn,
    DroptimizerWarn,
    type CharacterSummary,
    type PlayerWithSummaryCompact,
} from "@/shared/types/types"

export async function getRosterSummary(): Promise<CharacterSummary[]> {
    const roster = await characterRepo.getWithPlayerList()
    const charIds = roster.map((char) => char.id)
    const gameInfoData = await characterGameInfoRepo.getByCharsFull(charIds)
    const gameInfoByCharId = keyBy(gameInfoData, (g) => g.charId)
    const oneWeekAgo = DateTime.now().minus({ weeks: 1 }).toSeconds()

    return roster.map((char) => {
        const info = gameInfoByCharId[char.id]

        // Priority: droptimizer > blizzard
        const itemLevel =
            info?.droptimizer?.itemsAverageItemLevelEquipped?.toFixed(1) ??
            info?.blizzard?.equippedItemLevel?.toString() ??
            "?"

        // Priority: droptimizer > blizzard (filtered)
        const tierset: GearItem[] =
            info?.droptimizer?.tiersetInfo ??
            info?.blizzard?.itemsEquipped?.filter(
                (item: GearItem) => item.item.tierset
            ) ??
            []

        const warnDroptimizer = match(info?.droptimizer?.simDate)
            .with(P.nullish, () => DroptimizerWarn.NotImported)
            .when(
                (d) => d < oneWeekAgo,
                () => DroptimizerWarn.Outdated
            )
            .otherwise(() => DroptimizerWarn.None)

        const warnBlizzard = match(info?.blizzard)
            .with(P.nullish, () => BlizzardWarn.NotTracked)
            .otherwise(() => BlizzardWarn.None)

        return {
            character: char,
            itemLevel,
            weeklyChest: info?.droptimizer?.weeklyChest ?? [],
            tierset,
            currencies: info?.droptimizer?.currencies ?? [],
            warnDroptimizer,
            warnBlizzard,
        }
    })
}

function parseItemLevelCompact(gameInfo: CharacterGameInfoCompact | undefined): string {
    return (
        gameInfo?.droptimizer?.itemsAverageItemLevelEquipped?.toFixed(1) ??
        gameInfo?.blizzard?.equippedItemLevel?.toString() ??
        "?"
    )
}

function parseTiersetCountCompact(
    gameInfo: CharacterGameInfoCompact | undefined
): number {
    return (
        gameInfo?.droptimizer?.tiersetInfo?.length ??
        gameInfo?.blizzard?.itemsEquipped?.filter((item: GearItem) => item.item.tierset)
            .length ??
        0
    )
}

export async function getPlayersWithSummaryCompact(): Promise<
    PlayerWithSummaryCompact[]
> {
    const playersWithChars = await playerRepo.getWithCharactersList()
    const allChars = playersWithChars.flatMap((p) => p.characters)
    const charIds = allChars.map((c) => c.id)
    const gameInfoData = await characterGameInfoRepo.getByCharsCompact(charIds)
    const gameInfoByCharId = keyBy(gameInfoData, (g) => g.charId)

    return playersWithChars.map((player) => ({
        id: player.id,
        name: player.name,
        charsSummary: player.characters.map((char) => {
            const gameInfo = gameInfoByCharId[char.id]

            return {
                character: {
                    ...char,
                    player: { id: player.id, name: player.name },
                },
                itemLevel: parseItemLevelCompact(gameInfo),
                tiersetCount: parseTiersetCountCompact(gameInfo),
            }
        }),
    }))
}

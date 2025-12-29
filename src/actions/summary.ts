"use server"

import { keyBy } from "es-toolkit"
import { DateTime } from "luxon"
import { match, P } from "ts-pattern"
import { characterGameInfoRepo } from "@/db/repositories/character-game-info"
import { characterRepo } from "@/db/repositories/characters"
import { playerRepo } from "@/db/repositories/player.repo"
import type { CharacterGameInfoCompact } from "@/shared/models/character.model"
import {
    DroptimizerWarn,
    RaiderioWarn,
    WowAuditWarn,
    type CharacterSummary,
    type PlayerWithSummaryCompact,
} from "@/shared/types/types"

export async function getRosterSummary(): Promise<CharacterSummary[]> {
    const roster = await characterRepo.getWithPlayerList()
    const charList = roster.map((char) => ({ name: char.name, realm: char.realm }))
    const gameInfoData = await characterGameInfoRepo.getByCharsFull(charList)
    const gameInfoByChar = keyBy(gameInfoData, (g) => `${g.charName}-${g.charRealm}`)
    const oneWeekAgo = DateTime.now().minus({ weeks: 1 }).toSeconds()

    return roster.map((char) => {
        const charKey: `${string}-${string}` = `${char.name}-${char.realm}`
        const info = gameInfoByChar[charKey]

        // Priority: droptimizer > raiderio > wowaudit
        const itemLevel =
            info?.droptimizer?.itemsAverageItemLevelEquipped?.toFixed(1) ??
            info?.raiderio?.averageItemLevel ??
            info?.wowaudit?.averageIlvl ??
            "?"

        // Priority: droptimizer > wowaudit > raiderio (filtered)
        const tierset =
            info?.droptimizer?.tiersetInfo ??
            info?.wowaudit?.tiersetInfo ??
            info?.raiderio?.itemsEquipped?.filter((item) => item.item.tierset) ??
            []

        const warnDroptimizer = match(info?.droptimizer?.simDate)
            .with(P.nullish, () => DroptimizerWarn.NotImported)
            .when(
                (d) => d < oneWeekAgo,
                () => DroptimizerWarn.Outdated
            )
            .otherwise(() => DroptimizerWarn.None)

        const warnWowAudit = match(info?.wowaudit)
            .with(P.nullish, () => WowAuditWarn.NotTracked)
            .otherwise(() => WowAuditWarn.None)

        const warnRaiderio = match(info?.raiderio)
            .with(P.nullish, () => RaiderioWarn.NotTracked)
            .otherwise(() => RaiderioWarn.None)

        return {
            character: char,
            itemLevel,
            weeklyChest: info?.droptimizer?.weeklyChest ?? [],
            tierset,
            currencies: info?.droptimizer?.currencies ?? [],
            warnDroptimizer,
            warnWowAudit,
            warnRaiderio,
        }
    })
}

function parseItemLevelCompact(gameInfo: CharacterGameInfoCompact | undefined): string {
    return (
        gameInfo?.droptimizer?.itemsAverageItemLevelEquipped?.toFixed(1) ??
        gameInfo?.raiderio?.averageItemLevel ??
        gameInfo?.wowaudit?.averageIlvl ??
        "?"
    )
}

function parseTiersetCountCompact(
    gameInfo: CharacterGameInfoCompact | undefined
): number {
    return (
        gameInfo?.droptimizer?.tiersetInfo?.length ??
        gameInfo?.wowaudit?.tiersetInfo?.length ??
        gameInfo?.raiderio?.itemsEquipped?.filter((item) => item.item.tierset).length ??
        0
    )
}

export async function getPlayersWithSummaryCompact(): Promise<
    PlayerWithSummaryCompact[]
> {
    const playersWithChars = await playerRepo.getWithCharactersList()
    const allChars = playersWithChars.flatMap((p) => p.characters)
    const charList = allChars.map((c) => ({ name: c.name, realm: c.realm }))
    const gameInfoData = await characterGameInfoRepo.getByCharsCompact(charList)
    const gameInfoByChar = keyBy(gameInfoData, (g) => `${g.charName}-${g.charRealm}`)

    return playersWithChars.map((player) => ({
        id: player.id,
        name: player.name,
        charsSummary: player.characters.map((char) => {
            const charKey: `${string}-${string}` = `${char.name}-${char.realm}`
            const gameInfo = gameInfoByChar[charKey]

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

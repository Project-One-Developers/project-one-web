"use server"

import { bossRepo } from "@/db/repositories/bosses"
import { lootRepo } from "@/db/repositories/loots"
import { raidSessionRepo } from "@/db/repositories/raid-sessions"
import { safeAction } from "@/lib/errors/action-wrapper"
import { CURRENT_RAID_IDS } from "@/shared/libs/season-config"
import type { BossWithItems } from "@/shared/models/boss.models"
import type { LootWithAssigned } from "@/shared/models/loot.models"
import type {
    RaidSession,
    RaidSessionWithSummary,
} from "@/shared/models/raid-session.models"
import type { WowClassName } from "@/shared/models/wow.models"

type LootRecapItem = {
    loot: LootWithAssigned
    bossName: string
}

type LootRecapByCharacter = {
    character: {
        id: string
        name: string
        class: WowClassName
        main: boolean
    }
    items: LootRecapItem[]
    stats: {
        totalDpsGain: number
        tierSetProgress: {
            twoPieceCompleted: boolean
            fourPieceCompleted: boolean
        }
    }
}

type LootRecapDetail = {
    session: RaidSession
    recapByCharacter: LootRecapByCharacter[]
    totalStats: {
        itemCount: number
        totalDpsGain: number
        twoPieceCount: number
        fourPieceCount: number
    }
}

// Helper function to find boss name for an item
function findBossForItem(itemId: number, encounterList: BossWithItems[]): string {
    const boss = encounterList.find((b) => b.items.some((item) => item.id === itemId))
    return boss?.name ?? "Unknown"
}

export const getRaidSessionsForRecap = safeAction(
    async (): Promise<RaidSessionWithSummary[]> => {
        const sessions = await raidSessionRepo.getWithSummaryList()
        // Sort by date descending (most recent first)
        return sessions.sort((a, b) => b.raidDate - a.raidDate)
    }
)

export const getLootRecapBySession = safeAction(
    async (sessionId: string): Promise<LootRecapDetail> => {
        const [session, loots, ...encounterLists] = await Promise.all([
            raidSessionRepo.getById(sessionId),
            lootRepo.getByRaidSessionIdWithAssigned(sessionId),
            ...CURRENT_RAID_IDS.map((raidId) => bossRepo.getLootTable(raidId)),
        ])

        // Merge all boss lists from all raids into a single list
        const encounterList = encounterLists.flat()

        // Filter to only assigned loots and narrow the type
        const assignedLoots = loots.filter(
            (
                l
            ): l is LootWithAssigned & {
                assignedCharacter: NonNullable<LootWithAssigned["assignedCharacter"]>
            } => l.assignedCharacter !== null
        )

        // Group loots by assigned character
        const lootsByCharacter = Map.groupBy(assignedLoots, (l) => l.assignedCharacter.id)

        const recapByCharacter: LootRecapByCharacter[] = []

        for (const [, charLoots] of lootsByCharacter) {
            const firstLoot = charLoots[0]
            if (!firstLoot?.assignedCharacter) {
                continue
            }

            const char = firstLoot.assignedCharacter

            const items: LootRecapItem[] = charLoots.map((loot) => ({
                loot,
                bossName: findBossForItem(loot.itemId, encounterList),
            }))

            const totalDpsGain = charLoots.reduce(
                (sum, l) => sum + (l.assignedHighlights?.dpsGain ?? 0),
                0
            )

            const twoPieceCompleted = charLoots.some(
                (l) => l.assignedHighlights?.lootEnableTiersetBonus === "2p"
            )
            const fourPieceCompleted = charLoots.some(
                (l) => l.assignedHighlights?.lootEnableTiersetBonus === "4p"
            )

            recapByCharacter.push({
                character: {
                    id: char.id,
                    name: char.name,
                    class: char.class,
                    main: char.main,
                },
                items,
                stats: {
                    totalDpsGain,
                    tierSetProgress: {
                        twoPieceCompleted,
                        fourPieceCompleted,
                    },
                },
            })
        }

        // Sort by total DPS gain descending
        recapByCharacter.sort((a, b) => b.stats.totalDpsGain - a.stats.totalDpsGain)

        // Calculate total stats
        const totalStats = {
            itemCount: assignedLoots.length,
            totalDpsGain: recapByCharacter.reduce(
                (sum, r) => sum + r.stats.totalDpsGain,
                0
            ),
            twoPieceCount: recapByCharacter.filter(
                (r) => r.stats.tierSetProgress.twoPieceCompleted
            ).length,
            fourPieceCount: recapByCharacter.filter(
                (r) => r.stats.tierSetProgress.fourPieceCompleted
            ).length,
        }

        return {
            session,
            recapByCharacter,
            totalStats,
        }
    }
)

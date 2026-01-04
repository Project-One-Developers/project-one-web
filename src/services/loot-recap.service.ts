import "server-only"
import { bossRepo } from "@/db/repositories/bosses"
import { lootRepo } from "@/db/repositories/loots"
import { raidSessionRepo } from "@/db/repositories/raid-sessions"
import { CURRENT_RAID_ID } from "@/shared/libs/season-config"
import type { BossWithItems } from "@/shared/models/boss.models"
import type { Character } from "@/shared/models/character.models"
import type { LootWithAssigned } from "@/shared/models/loot.models"
import type {
    RaidSession,
    RaidSessionWithSummary,
} from "@/shared/models/raid-session.models"
import type { WowClassName } from "@/shared/models/wow.models"

export type LootRecapItem = {
    loot: LootWithAssigned
    bossName: string
}

export type LootRecapByCharacter = {
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

export type LootRecapDetail = {
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

// Helper function to extract character info from full character object
function extractCharacterInfo(char: Character) {
    return {
        id: char.id,
        name: char.name,
        class: char.class,
        main: char.main,
    }
}

export const lootRecapService = {
    getSessionsWithSummary: async (): Promise<RaidSessionWithSummary[]> => {
        const sessions = await raidSessionRepo.getWithSummaryList()
        // Sort by date descending (most recent first)
        return sessions.sort((a, b) => b.raidDate - a.raidDate)
    },

    getRecapBySession: async (sessionId: string): Promise<LootRecapDetail> => {
        const [session, loots, encounterList] = await Promise.all([
            raidSessionRepo.getById(sessionId),
            lootRepo.getByRaidSessionIdWithAssigned(sessionId),
            bossRepo.getLootTable(CURRENT_RAID_ID),
        ])

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
                character: extractCharacterInfo(char),
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
    },
}

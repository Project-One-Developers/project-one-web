import "server-only"
import { blizzardRepo } from "@/db/repositories/blizzard"
import { playerRepo } from "@/db/repositories/player.repo"
import type { PlayerMountStatus } from "@/shared/models/mount.models"
import { CURRENT_MOUNT_ID } from "@/shared/wow.consts"

export const mountTrackerService = {
    /**
     * Get mount status for all players using their representative character.
     * Priority: Main char with sync data > Most recently logged in > Any synced char > Any char
     */
    getPlayerMountStatuses: async (): Promise<PlayerMountStatus[]> => {
        // 1. Get all players with their characters
        const playersWithChars = await playerRepo.getWithCharactersList()

        // 2. Get blizzard data for all characters
        const allCharIds = playersWithChars.flatMap((p) => p.characters.map((c) => c.id))
        const blizzardData = await blizzardRepo.getByCharIds(allCharIds)
        const blizzardMap = new Map(blizzardData.map((b) => [b.characterId, b]))

        // 3. For each player, select representative character
        const results: PlayerMountStatus[] = []

        for (const player of playersWithChars) {
            if (player.characters.length === 0) {
                continue
            }

            const firstChar = player.characters[0]
            if (!firstChar) {
                continue
            }

            // Find representative character: main with blizz data > any with blizz data sorted by lastLoginAt > first char
            const charsWithBlizzard = player.characters
                .map((c) => ({ char: c, blizz: blizzardMap.get(c.id) }))
                .filter(
                    (
                        x
                    ): x is {
                        char: typeof firstChar
                        blizz: NonNullable<typeof x.blizz>
                    } => !!x.blizz
                )

            if (charsWithBlizzard.length === 0) {
                // No synced characters - use first character (fallback)
                results.push({
                    playerId: player.id,
                    playerName: player.name,
                    characterId: firstChar.id,
                    characterName: firstChar.name,
                    characterClass: firstChar.class,
                    characterRealm: firstChar.realm,
                    equippedItemLevel: null,
                    lastLoginAt: null,
                    hasMount: false,
                })
                continue
            }

            // Sort by priority: main first, then by lastLoginAt descending
            charsWithBlizzard.sort((a, b) => {
                if (a.char.main && !b.char.main) {
                    return -1
                }
                if (!a.char.main && b.char.main) {
                    return 1
                }
                // Both main or both alt - sort by lastLoginAt (most recent first)
                const aLogin = a.blizz.lastLoginAt
                const bLogin = b.blizz.lastLoginAt
                return bLogin - aLogin
            })

            const representative = charsWithBlizzard[0]
            if (!representative) {
                continue
            }

            const hasMount =
                representative.blizz.mountIds?.includes(CURRENT_MOUNT_ID) ?? false

            results.push({
                playerId: player.id,
                playerName: player.name,
                characterId: representative.char.id,
                characterName: representative.char.name,
                characterClass: representative.char.class,
                characterRealm: representative.char.realm,
                equippedItemLevel: representative.blizz.equippedItemLevel,
                lastLoginAt: representative.blizz.lastLoginAt,
                hasMount,
            })
        }

        // Sort by player name
        return results.sort((a, b) => a.playerName.localeCompare(b.playerName))
    },
}

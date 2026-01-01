import type { Character, CharacterWithPlayer } from "./models/character.models"
import type { GearItem } from "./models/item.models"
import type { CharAssignmentHighlights, LootWithItem } from "./models/loot.models"
import type {
    Droptimizer,
    DroptimizerCurrency,
    DroptimizerUpgrade,
} from "./models/simulation.models"
import type {
    BlizzardWarn,
    DroptimizerWarn,
    WowClassName,
    WoWRole,
    WoWRolePosition,
    WowSpecName,
} from "./models/wow.models"

// Re-export warn types and constants from wow.models for backward compatibility
export {
    type BlizzardWarn,
    BLIZZARD_WARN,
    type DroptimizerWarn,
    DROPTIMIZER_WARN,
} from "./models/wow.models"

// Manual types (not derived from Zod schemas)

// Generic Result types for success/failure operations
export type Result<T, E = string> =
    | { success: true; data: T }
    | { success: false; error: E }

export type VoidResult<E = string> = { success: true } | { success: false; error: E }

export type WowSpec = {
    id: number
    name: WowSpecName
    role: WoWRole
    position: WoWRolePosition
}

export type WowClass = {
    id: number
    name: WowClassName
    specs: WowSpec[]
}

export enum TierSetCompletion {
    None = 0,
    OnePiece = 1,
    TwoPiece = 2,
    ThreePiece = 3,
    FourPiece = 4,
    FivePiece = 5,
}

export type CharacterSummary = {
    character: CharacterWithPlayer
    itemLevel: string
    weeklyChest: GearItem[]
    tierset: GearItem[]
    currencies: DroptimizerCurrency[]
    warnDroptimizer: DroptimizerWarn
    warnBlizzard: BlizzardWarn
    blizzardSyncedAt?: number
}

export type CharacterSummaryCompact = {
    character: CharacterWithPlayer
    itemLevel: string
    tiersetCount: number
}

export type PlayerWithSummaryCompact = {
    id: string
    name: string
    charsSummary: CharacterSummaryCompact[]
}

export type CharAssignmentInfo = {
    character: Character
    droptimizers: {
        upgrade: DroptimizerUpgrade | null
        itemEquipped: GearItem
        droptimizer: Droptimizer
    }[]
    weeklyChest: GearItem[]
    tierset: GearItem[]
    catalystCharge: number
    bestItemsInSlot: GearItem[]
    bisForSpec: WowSpec[]
    alreadyGotIt: boolean
    warnDroptimizer: DroptimizerWarn
    warnBlizzard: BlizzardWarn
    highlights: CharAssignmentHighlights
}

export type LootAssignmentInfo = {
    loot: LootWithItem
    eligible: CharAssignmentInfo[]
}

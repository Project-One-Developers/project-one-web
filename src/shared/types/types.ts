// Manual types (not derived from Zod schemas)
import type { Character, CharacterWithPlayer } from "../models/character.model"
import type { GearItem } from "../models/item.model"
import type { CharAssignmentHighlights, LootWithItem } from "../models/loot.model"
import type {
    Droptimizer,
    DroptimizerCurrency,
    DroptimizerUpgrade,
} from "../models/simulation.model"
import type {
    WowClassName,
    WoWRole,
    WoWRolePosition,
    WowSpecName,
} from "../models/wow.model"

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

export enum DroptimizerWarn {
    None = "none",
    Outdated = "outdated",
    NotImported = "missing",
}

export enum BlizzardWarn {
    None = "none",
    Outdated = "outdated",
    NotTracked = "not-tracked",
}

export type CharacterSummary = {
    character: CharacterWithPlayer
    itemLevel: string
    weeklyChest: GearItem[]
    tierset: GearItem[]
    currencies: DroptimizerCurrency[]
    warnDroptimizer: DroptimizerWarn
    warnBlizzard: BlizzardWarn
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

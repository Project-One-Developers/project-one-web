"use client"

import type { ReactNode } from "react"
import type { GearItem } from "@/shared/models/item.models"
import type { WowItemEquippedSlotKey } from "@/shared/models/wow.models"
import CharacterPaperdoll from "./wow/character-paperdoll"
import { WowGearIcon } from "./wow/wow-gear-icon"

type CharacterGearLayoutProps = {
    renderGearSlot: (
        slotKey: WowItemEquippedSlotKey,
        options?: { rightSide?: boolean }
    ) => ReactNode
    tiersetInfo?: GearItem[]
}

export default function CharacterGearLayout({
    renderGearSlot,
    tiersetInfo,
}: CharacterGearLayoutProps) {
    const hasTierItems = tiersetInfo && tiersetInfo.length > 0

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 min-h-0">
                <CharacterPaperdoll renderGearSlot={renderGearSlot} />
            </div>

            {/* Tier Set Section - always rendered for consistent layout */}
            <div className="bg-background/50 rounded-lg p-4 mt-3 shrink-0">
                <h3 className="font-semibold mb-2 text-sm">Tier Set Pieces</h3>
                <div className="flex justify-center gap-3">
                    {hasTierItems
                        ? tiersetInfo.map((tierItem) => (
                              <WowGearIcon
                                  key={tierItem.item.id}
                                  gearItem={tierItem}
                                  showTiersetLine={false}
                                  iconClassName="rounded-lg h-10 w-10 border border-orange-500/50 shadow-md"
                              />
                          ))
                        : Array.from({ length: 5 }, (_, i) => (
                              <div key={i} className="flex flex-col items-center">
                                  <div className="rounded-lg h-10 w-10 bg-black/40 ring-1 ring-white/10" />
                                  <span className="font-medium text-xs text-muted-foreground mt-1">
                                      N/A
                                  </span>
                              </div>
                          ))}
                </div>
            </div>
        </div>
    )
}

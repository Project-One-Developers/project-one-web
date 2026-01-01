"use client"

import type { ReactNode } from "react"
import type { WowItemEquippedSlotKey } from "@/shared/models/wow.models"

type CharacterPaperdollProps = {
    renderGearSlot: (
        slotKey: WowItemEquippedSlotKey,
        options?: { rightSide?: boolean }
    ) => ReactNode
}

// WoW Armory slot order
const LEFT_SLOTS: WowItemEquippedSlotKey[] = [
    "head",
    "neck",
    "shoulder",
    "back",
    "chest",
    "shirt",
    "tabard",
    "wrist",
]

const RIGHT_SLOTS: WowItemEquippedSlotKey[] = [
    "hands",
    "waist",
    "legs",
    "feet",
    "finger1",
    "finger2",
    "trinket1",
    "trinket2",
]

export default function CharacterPaperdoll({ renderGearSlot }: CharacterPaperdollProps) {
    return (
        <div className="relative w-full h-full flex flex-col">
            {/* Main gear area - left and right columns */}
            <div className="flex-1 flex">
                {/* Left Column - fixed to left edge */}
                <div className="flex flex-col justify-between py-2 w-70 shrink-0">
                    {LEFT_SLOTS.map((slot) => (
                        <div key={slot} className="flex justify-start">
                            {renderGearSlot(slot, { rightSide: false })}
                        </div>
                    ))}
                </div>

                {/* Center spacer - character render area */}
                <div className="flex-1" />

                {/* Right Column - fixed to right edge */}
                <div className="flex flex-col justify-between py-2 w-70 shrink-0">
                    {RIGHT_SLOTS.map((slot) => (
                        <div key={slot} className="flex justify-end">
                            {renderGearSlot(slot, { rightSide: true })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Row - Weapons centered in the middle area (between columns) */}
            <div className="flex py-3 shrink-0">
                <div className="w-70 shrink-0" />
                <div className="flex-1 flex items-center gap-8">
                    <div className="flex-1 flex justify-end">
                        {renderGearSlot("main_hand", { rightSide: true })}
                    </div>
                    <div className="flex-1 flex justify-start">
                        {renderGearSlot("off_hand", { rightSide: false })}
                    </div>
                </div>
                <div className="w-70 shrink-0" />
            </div>
        </div>
    )
}

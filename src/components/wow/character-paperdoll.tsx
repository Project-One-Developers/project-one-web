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
        <div className="relative w-full h-full grid grid-cols-[22%_1fr_22%] grid-rows-[1fr_auto]">
            {/* Left Column - gear slots with consistent spacing */}
            <div className="flex flex-col justify-around py-1">
                {LEFT_SLOTS.map((slot) => (
                    <div key={slot} className="flex justify-start">
                        {renderGearSlot(slot, { rightSide: false })}
                    </div>
                ))}
            </div>

            {/* Center spacer - character render area */}
            <div />

            {/* Right Column - gear slots with consistent spacing */}
            <div className="flex flex-col justify-around py-1">
                {RIGHT_SLOTS.map((slot) => (
                    <div key={slot} className="flex justify-end">
                        {renderGearSlot(slot, { rightSide: true })}
                    </div>
                ))}
            </div>

            {/* Bottom Row - Weapons centered, spans all columns */}
            <div className="col-span-3 flex py-2">
                <div className="w-[22%] shrink-0" />
                <div className="flex-1 flex items-center justify-center gap-8">
                    <div className="flex justify-end">
                        {renderGearSlot("main_hand", { rightSide: true })}
                    </div>
                    <div className="flex justify-start">
                        {renderGearSlot("off_hand", { rightSide: false })}
                    </div>
                </div>
                <div className="w-[22%] shrink-0" />
            </div>
        </div>
    )
}

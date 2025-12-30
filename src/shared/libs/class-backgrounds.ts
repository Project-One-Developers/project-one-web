import type { WowClassName } from "@/shared/models/wow.model"

/** WoW class colors (official Blizzard colors) */
const CLASS_COLORS: Record<WowClassName, string> = {
    "Death Knight": "#C41E3A",
    "Demon Hunter": "#A330C9",
    Druid: "#FF7C0A",
    Evoker: "#33937F",
    Hunter: "#AAD372",
    Mage: "#3FC7EB",
    Monk: "#00FF98",
    Paladin: "#F48CBA",
    Priest: "#FFFFFF",
    Rogue: "#FFF468",
    Shaman: "#0070DD",
    Warlock: "#8788EE",
    Warrior: "#C69B6D",
}

/** Get modern layered background style for a WoW class */
export function getClassBackgroundStyle(className: WowClassName): React.CSSProperties {
    const color = CLASS_COLORS[className]
    return {
        background: `
            radial-gradient(ellipse 70% 50% at 50% 55%, ${color}35 0%, transparent 60%),
            radial-gradient(ellipse 100% 70% at 50% 60%, ${color}18 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.6) 100%),
            linear-gradient(180deg, rgba(10,10,15,0.95) 0%, rgba(8,8,12,1) 100%)
        `.replace(/\s+/g, " "),
    }
}

export const MAX_CHARACTER_NAME_LENGTH = 50 // WoW limit is ~12-24 depending on locale, using 50 for safety

export const CLASSES_NAME = [
    "Death Knight",
    "Demon Hunter",
    "Druid",
    "Evoker",
    "Hunter",
    "Mage",
    "Monk",
    "Paladin",
    "Priest",
    "Rogue",
    "Shaman",
    "Warlock",
    "Warrior",
] as const

export const WOW_CLASS_WITH_SPECS = [
    {
        id: 1,
        name: "Warrior",
        specs: [
            { id: 71, name: "Arms", role: "DPS", position: "Melee" },
            { id: 72, name: "Fury", role: "DPS", position: "Melee" },
            { id: 73, name: "Protection", role: "Tank", position: "Melee" },
        ],
    },
    {
        id: 2,
        name: "Paladin",
        specs: [
            { id: 65, name: "Holy", role: "Healer", position: "Melee" },
            { id: 66, name: "Protection", role: "Tank", position: "Melee" },
            { id: 70, name: "Retribution", role: "DPS", position: "Melee" },
        ],
    },
    {
        id: 3,
        name: "Hunter",
        specs: [
            { id: 253, name: "Beast Mastery", role: "DPS", position: "Ranged" },
            { id: 254, name: "Marksmanship", role: "DPS", position: "Ranged" },
            { id: 255, name: "Survival", role: "DPS", position: "Melee" },
        ],
    },
    {
        id: 4,
        name: "Rogue",
        specs: [
            { id: 259, name: "Assassination", role: "DPS", position: "Melee" },
            { id: 260, name: "Outlaw", role: "DPS", position: "Melee" },
            { id: 261, name: "Subtlety", role: "DPS", position: "Melee" },
        ],
    },
    {
        id: 5,
        name: "Priest",
        specs: [
            { id: 256, name: "Discipline", role: "Healer", position: "Ranged" },
            { id: 257, name: "Holy", role: "Healer", position: "Ranged" },
            { id: 258, name: "Shadow", role: "DPS", position: "Ranged" },
        ],
    },
    {
        id: 6,
        name: "Death Knight",
        specs: [
            { id: 250, name: "Blood", role: "Tank", position: "Melee" },
            { id: 251, name: "Frost", role: "DPS", position: "Melee" },
            { id: 252, name: "Unholy", role: "DPS", position: "Melee" },
        ],
    },
    {
        id: 7,
        name: "Shaman",
        specs: [
            { id: 262, name: "Elemental", role: "DPS", position: "Ranged" },
            { id: 263, name: "Enhancement", role: "DPS", position: "Melee" },
            { id: 264, name: "Restoration", role: "Healer", position: "Ranged" },
        ],
    },
    {
        id: 8,
        name: "Mage",
        specs: [
            { id: 62, name: "Arcane", role: "DPS", position: "Ranged" },
            { id: 63, name: "Fire", role: "DPS", position: "Ranged" },
            { id: 64, name: "Frost", role: "DPS", position: "Ranged" },
        ],
    },
    {
        id: 9,
        name: "Warlock",
        specs: [
            { id: 265, name: "Affliction", role: "DPS", position: "Ranged" },
            { id: 266, name: "Demonology", role: "DPS", position: "Ranged" },
            { id: 267, name: "Destruction", role: "DPS", position: "Ranged" },
        ],
    },
    {
        id: 10,
        name: "Monk",
        specs: [
            { id: 268, name: "Brewmaster", role: "Tank", position: "Melee" },
            { id: 269, name: "Windwalker", role: "DPS", position: "Melee" },
            { id: 270, name: "Mistweaver", role: "Healer", position: "Melee" },
        ],
    },
    {
        id: 11,
        name: "Druid",
        specs: [
            { id: 102, name: "Balance", role: "DPS", position: "Ranged" },
            { id: 103, name: "Feral", role: "DPS", position: "Melee" },
            { id: 104, name: "Guardian", role: "Tank", position: "Melee" },
            { id: 105, name: "Restoration", role: "DPS", position: "Ranged" },
        ],
    },
    {
        id: 12,
        name: "Demon Hunter",
        specs: [
            { id: 577, name: "Havoc", role: "DPS", position: "Melee" },
            { id: 581, name: "Vengeance", role: "Tank", position: "Melee" },
            { id: 1480, name: "Devourer", role: "DPS", position: "Ranged" },
        ],
    },
    {
        id: 13,
        name: "Evoker",
        specs: [
            { id: 1467, name: "Devastation", role: "DPS", position: "Ranged" },
            { id: 1468, name: "Preservation", role: "Healer", position: "Ranged" },
            { id: 1473, name: "Augmentation", role: "DPS", position: "Ranged" },
        ],
    },
] as const

type WowClassWithSpecs = typeof WOW_CLASS_WITH_SPECS
type AnySpec = WowClassWithSpecs[number]["specs"][number]

export type WowSpecId = AnySpec["id"]

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- z.enum() needs a non-empty readonly tuple, flatMap can't prove that
export const SPECS_NAME = WOW_CLASS_WITH_SPECS.flatMap((c) =>
    c.specs.map((s) => s.name)
) as unknown as readonly [AnySpec["name"], ...AnySpec["name"][]]
export const ROLES = ["Tank", "Healer", "DPS"] as const
export const RAID_DIFF = ["LFR", "Normal", "Heroic", "Mythic"] as const

export const ARMOR_TYPES = ["Cloth", "Leather", "Mail", "Plate"] as const

export const CLASS_TO_ARMOR_TYPE: Record<
    (typeof CLASSES_NAME)[number],
    (typeof ARMOR_TYPES)[number]
> = {
    "Death Knight": "Plate",
    "Demon Hunter": "Leather",
    Druid: "Leather",
    Evoker: "Mail",
    Hunter: "Mail",
    Mage: "Cloth",
    Monk: "Leather",
    Paladin: "Plate",
    Priest: "Cloth",
    Rogue: "Leather",
    Shaman: "Mail",
    Warlock: "Cloth",
    Warrior: "Plate",
} as const

export const ITEM_SLOTS_DESC = [
    "Head",
    "Neck",
    "Shoulder",
    "Back",
    "Chest",
    "Wrist",
    "Hands",
    "Waist",
    "Legs",
    "Feet",
    "Finger",
    "Trinket",
    "Main Hand",
    "Off Hand",
    "Two Hand",
    "Ranged",
    "Omni",
] as const

export const ITEM_SLOTS_KEY = [
    "head",
    "neck",
    "shoulder",
    "back",
    "chest",
    "wrist",
    "hands",
    "waist",
    "legs",
    "feet",
    "finger",
    "trinket",
    "main_hand",
    "off_hand",
    "omni",
] as const

// Equipped slots - actual character slots (finger1/2, trinket1/2 instead of generic)
export const ITEM_EQUIPPED_SLOTS_KEY = [
    "head",
    "neck",
    "shoulder",
    "back",
    "chest",
    "shirt",
    "tabard",
    "wrist",
    "hands",
    "waist",
    "legs",
    "feet",
    "finger1",
    "finger2",
    "trinket1",
    "trinket2",
    "main_hand",
    "off_hand",
] as const

export const ITEM_SLOTS_KEY_TIERSET = [
    "head",
    "shoulder",
    "chest",
    "hands",
    "legs",
] as const

// Raid difficulty bonus IDs
export const RAID_DIFF_BONUS_IDS = {
    LFR: 10353,
    Normal: null,
    Heroic: 10355,
    Mythic: 10356,
} as const satisfies Record<(typeof RAID_DIFF)[number], number | null>

// Item track names
export const ITEM_TRACK_NAMES = [
    "Explorer",
    "Adventurer",
    "Veteran",
    "Champion",
    "Hero",
    "Myth",
] as const

// Single source of truth: raid difficulty → track name
export const RAID_DIFF_TO_TRACK = {
    LFR: "Veteran",
    Normal: "Champion",
    Heroic: "Hero",
    Mythic: "Myth",
} as const satisfies Record<(typeof RAID_DIFF)[number], (typeof ITEM_TRACK_NAMES)[number]>

// Reverse lookup: track name → raid difficulty (Explorer/Adventurer default to LFR)
export const TRACK_TO_RAID_DIFF = {
    Explorer: "LFR",
    Adventurer: "LFR",
    Veteran: "LFR",
    Champion: "Normal",
    Hero: "Heroic",
    Myth: "Mythic",
} as const satisfies Record<(typeof ITEM_TRACK_NAMES)[number], (typeof RAID_DIFF)[number]>

// Derived: difficulty bonus ID → track name
type DiffBonusId = NonNullable<
    (typeof RAID_DIFF_BONUS_IDS)[keyof typeof RAID_DIFF_BONUS_IDS]
>
export const DIFF_BONUS_ID_TO_TRACK: Record<
    DiffBonusId,
    (typeof ITEM_TRACK_NAMES)[number]
> = {
    [RAID_DIFF_BONUS_IDS.LFR]: RAID_DIFF_TO_TRACK.LFR,
    [RAID_DIFF_BONUS_IDS.Heroic]: RAID_DIFF_TO_TRACK.Heroic,
    [RAID_DIFF_BONUS_IDS.Mythic]: RAID_DIFF_TO_TRACK.Mythic,
}

export const PROFESSION_TYPES = new Set([
    "Alchemy",
    "Blacksmithing",
    "Enchanting",
    "Engineering",
    "Herbalism",
    "Inscription",
    "Jewelcrafting",
    "Leatherworking",
    "Mining",
    "Skinning",
    "Tailoring",
    "Cooking",
])

export const REALMS = {
    EU: [
        { name: "Aegwynn", slug: "aegwynn" },
        { name: "Aerie Peak", slug: "aerie-peak" },
        { name: "Agamaggan", slug: "agamaggan" },
        { name: "Aggra (Português)", slug: "aggra-português" },
        { name: "Aggramar", slug: "aggramar" },
        { name: "Ahn'Qiraj", slug: "ahnqiraj" },
        { name: "Al'Akir", slug: "alakir" },
        { name: "Alexstrasza", slug: "alexstrasza" },
        { name: "Alleria", slug: "alleria" },
        { name: "Alonsus", slug: "alonsus" },
        { name: "Aman'Thul", slug: "amanthul" },
        { name: "Ambossar", slug: "ambossar" },
        { name: "Anachronos", slug: "anachronos" },
        { name: "Anetheron", slug: "anetheron" },
        { name: "Antonidas", slug: "antonidas" },
        { name: "Anub'arak", slug: "anubarak" },
        { name: "Arak-arahm", slug: "arakarahm" },
        { name: "Arathi", slug: "arathi" },
        { name: "Arathor", slug: "arathor" },
        { name: "Archimonde", slug: "archimonde" },
        { name: "Area 52", slug: "area-52" },
        { name: "Argent Dawn", slug: "argent-dawn" },
        { name: "Arthas", slug: "arthas" },
        { name: "Arygos", slug: "arygos" },
        { name: "Aszune", slug: "aszune" },
        { name: "Auchindoun", slug: "auchindoun" },
        { name: "Azjol-Nerub", slug: "azjolnerub" },
        { name: "Azshara", slug: "azshara" },
        { name: "Azuremyst", slug: "azuremyst" },
        { name: "Baelgun", slug: "baelgun" },
        { name: "Balnazzar", slug: "balnazzar" },
        { name: "Blackhand", slug: "blackhand" },
        { name: "Blackmoore", slug: "blackmoore" },
        { name: "Blackrock", slug: "blackrock" },
        { name: "Blade's Edge", slug: "blades-edge" },
        { name: "Bladefist", slug: "bladefist" },
        { name: "Bloodfeather", slug: "bloodfeather" },
        { name: "Bloodhoof", slug: "bloodhoof" },
        { name: "Bloodscalp", slug: "bloodscalp" },
        { name: "Blutkessel", slug: "blutkessel" },
        { name: "Boulderfist", slug: "boulderfist" },
        { name: "Bronze Dragonflight", slug: "bronze-dragonflight" },
        { name: "Bronzebeard", slug: "bronzebeard" },
        { name: "Burning Blade", slug: "burning-blade" },
        { name: "Burning Legion", slug: "burning-legion" },
        { name: "Burning Steppes", slug: "burning-steppes" },
        { name: "C'Thun", slug: "cthun" },
        { name: "Chamber of Aspects", slug: "chamber-of-aspects" },
        { name: "Chants éternels", slug: "chants-éternels" },
        { name: "Cho'gall", slug: "chogall" },
        { name: "Chromaggus", slug: "chromaggus" },
        { name: "Confrérie du Thorium", slug: "confrérie-du-thorium" },
        { name: "Conseil des Ombres", slug: "conseil-des-ombres" },
        { name: "Crushridge", slug: "crushridge" },
        { name: "Culte de la Rive noire", slug: "culte-de-la-rive-noire" },
        { name: "Daggerspine", slug: "daggerspine" },
        { name: "Dalaran", slug: "dalaran" },
        { name: "Dalvengyr", slug: "dalvengyr" },
        { name: "Darkmoon Faire", slug: "darkmoon-faire" },
        { name: "Darksorrow", slug: "darksorrow" },
        { name: "Darkspear", slug: "darkspear" },
        { name: "Das Konsortium", slug: "das-konsortium" },
        { name: "Das Syndikat", slug: "das-syndikat" },
        { name: "Deathwing", slug: "deathwing" },
        { name: "Defias Brotherhood", slug: "defias-brotherhood" },
        { name: "Dentarg", slug: "dentarg" },
        { name: "Der abyssische Rat", slug: "der-abyssische-rat" },
        { name: "Der Mithrilorden", slug: "der-mithrilorden" },
        { name: "Der Rat von Dalaran", slug: "der-rat-von-dalaran" },
        { name: "Destromath", slug: "destromath" },
        { name: "Dethecus", slug: "dethecus" },
        { name: "Die Aldor", slug: "die-aldor" },
        { name: "Die Arguswacht", slug: "die-arguswacht" },
        { name: "Die ewige Wacht", slug: "die-ewige-wacht" },
        { name: "Die Nachtwache", slug: "die-nachtwache" },
        { name: "Die Silberne Hand", slug: "die-silberne-hand" },
        { name: "Die Todeskrallen", slug: "die-todeskrallen" },
        { name: "Doomhammer", slug: "doomhammer" },
        { name: "Draenor", slug: "draenor" },
        { name: "Dragonblight", slug: "dragonblight" },
        { name: "Dragonmaw", slug: "dragonmaw" },
        { name: "Drak'thul", slug: "drakthul" },
        { name: "Drek'Thar", slug: "drekthar" },
        { name: "Dun Modr", slug: "dun-modr" },
        { name: "Dun Morogh", slug: "dun-morogh" },
        { name: "Dunemaul", slug: "dunemaul" },
        { name: "Durotan", slug: "durotan" },
        { name: "Earthen Ring", slug: "earthen-ring" },
        { name: "Echsenkessel", slug: "echsenkessel" },
        { name: "Eitrigg", slug: "eitrigg" },
        { name: "Eldre'Thalas", slug: "eldrethalas" },
        { name: "Elune", slug: "elune" },
        { name: "Emerald Dream", slug: "emerald-dream" },
        { name: "Emeriss", slug: "emeriss" },
        { name: "Eonar", slug: "eonar" },
        { name: "Eredar", slug: "eredar" },
        { name: "Executus", slug: "executus" },
        { name: "Exodar", slug: "exodar" },
        { name: "Festung der Stürme", slug: "festung-der-stürme" },
        { name: "Forscherliga", slug: "forscherliga" },
        { name: "Frostmane", slug: "frostmane" },
        { name: "Frostmourne", slug: "frostmourne" },
        { name: "Frostwhisper", slug: "frostwhisper" },
        { name: "Frostwolf", slug: "frostwolf" },
        { name: "Garona", slug: "garona" },
        { name: "Garrosh", slug: "garrosh" },
        { name: "Genjuros", slug: "genjuros" },
        { name: "Ghostlands", slug: "ghostlands" },
        { name: "Gilneas", slug: "gilneas" },
        { name: "Gorgonnash", slug: "gorgonnash" },
        { name: "Grim Batol", slug: "grim-batol" },
        { name: "Gul'dan", slug: "guldan" },
        { name: "Hakkar", slug: "hakkar" },
        { name: "Haomarush", slug: "haomarush" },
        { name: "Hellfire", slug: "hellfire" },
        { name: "Hellscream", slug: "hellscream" },
        { name: "Hyjal", slug: "hyjal" },
        { name: "Illidan", slug: "illidan" },
        { name: "Jaedenar", slug: "jaedenar" },
        { name: "Kael'thas", slug: "kaelthas" },
        { name: "Karazhan", slug: "karazhan" },
        { name: "Kargath", slug: "kargath" },
        { name: "Kazzak", slug: "kazzak" },
        { name: "Kel'Thuzad", slug: "kelthuzad" },
        { name: "Khadgar", slug: "khadgar" },
        { name: "Khaz Modan", slug: "khaz-modan" },
        { name: "Khaz'goroth", slug: "khazgoroth" },
        { name: "Kil'jaeden", slug: "kiljaeden" },
        { name: "Kilrogg", slug: "kilrogg" },
        { name: "Kirin Tor", slug: "kirin-tor" },
        { name: "Kor'gall", slug: "korgall" },
        { name: "Krag'jin", slug: "kragjin" },
        { name: "Krasus", slug: "krasus" },
        { name: "Kul Tiras", slug: "kul-tiras" },
        { name: "Kult der Verdammten", slug: "kult-der-verdammten" },
        { name: "La Croisade écarlate", slug: "la-croisade-écarlate" },
        { name: "Laughing Skull", slug: "laughing-skull" },
        { name: "Les Clairvoyants", slug: "les-clairvoyants" },
        { name: "Les Sentinelles", slug: "les-sentinelles" },
        { name: "Lightbringer", slug: "lightbringer" },
        { name: "Lightning's Blade", slug: "lightnings-blade" },
        { name: "Lordaeron", slug: "lordaeron" },
        { name: "Los Errantes", slug: "los-errantes" },
        { name: "Lothar", slug: "lothar" },
        { name: "Madmortem", slug: "madmortem" },
        { name: "Magtheridon", slug: "magtheridon" },
        { name: "Mal'Ganis", slug: "malganis" },
        { name: "Malfurion", slug: "malfurion" },
        { name: "Malorne", slug: "malorne" },
        { name: "Malygos", slug: "malygos" },
        { name: "Mannoroth", slug: "mannoroth" },
        { name: "Marécage de Zangar", slug: "marécage-de-zangar" },
        { name: "Mazrigos", slug: "mazrigos" },
        { name: "Medivh", slug: "medivh" },
        { name: "Minahonda", slug: "minahonda" },
        { name: "Moonglade", slug: "moonglade" },
        { name: "Mug'thol", slug: "mugthol" },
        { name: "Nagrand", slug: "nagrand" },
        { name: "Nathrezim", slug: "nathrezim" },
        { name: "Naxxramas", slug: "naxxramas" },
        { name: "Nazjatar", slug: "nazjatar" },
        { name: "Nefarian", slug: "nefarian" },
        { name: "Nemesis", slug: "nemesis" },
        { name: "Neptulon", slug: "neptulon" },
        { name: "Ner'zhul", slug: "nerzhul" },
        { name: "Nera'thor", slug: "nerathor" },
        { name: "Nethersturm", slug: "nethersturm" },
        { name: "Nordrassil", slug: "nordrassil" },
        { name: "Norgannon", slug: "norgannon" },
        { name: "Nozdormu", slug: "nozdormu" },
        { name: "Onyxia", slug: "onyxia" },
        { name: "Outland", slug: "outland" },
        { name: "Perenolde", slug: "perenolde" },
        { name: "Pozzo dell'Eternità", slug: "pozzo-delleternità" },
        { name: "Proudmoore", slug: "proudmoore" },
        { name: "Quel'Thalas", slug: "quelthalas" },
        { name: "Ragnaros", slug: "ragnaros" },
        { name: "Rajaxx", slug: "rajaxx" },
        { name: "Rashgarroth", slug: "rashgarroth" },
        { name: "Ravencrest", slug: "ravencrest" },
        { name: "Ravenholdt", slug: "ravenholdt" },
        { name: "Rexxar", slug: "rexxar" },
        { name: "Runetotem", slug: "runetotem" },
        { name: "Sanguino", slug: "sanguino" },
        { name: "Sargeras", slug: "sargeras" },
        { name: "Saurfang", slug: "saurfang" },
        { name: "Scarshield Legion", slug: "scarshield-legion" },
        { name: "Sen'jin", slug: "senjin" },
        { name: "Shadowsong", slug: "shadowsong" },
        { name: "Shattered Halls", slug: "shattered-halls" },
        { name: "Shattered Hand", slug: "shattered-hand" },
        { name: "Shattrath", slug: "shattrath" },
        { name: "Shen'dralar", slug: "shendralar" },
        { name: "Silvermoon", slug: "silvermoon" },
        { name: "Sinstralis", slug: "sinstralis" },
        { name: "Skullcrusher", slug: "skullcrusher" },
        { name: "Spinebreaker", slug: "spinebreaker" },
        { name: "Spirestone", slug: "colinas-pardas" },
        { name: "Sporeggar", slug: "sporeggar" },
        { name: "Steamwheedle Cartel", slug: "steamwheedle-cartel" },
        { name: "Stormrage", slug: "stormrage" },
        { name: "Stormreaver", slug: "stormreaver" },
        { name: "Stormscale", slug: "stormscale" },
        { name: "Sunstrider", slug: "sunstrider" },
        { name: "Suramar", slug: "suramar" },
        { name: "Sylvanas", slug: "sylvanas" },
        { name: "Taerar", slug: "taerar" },
        { name: "Talnivarr", slug: "talnivarr" },
        { name: "Tarren Mill", slug: "tarren-mill" },
        { name: "Teldrassil", slug: "teldrassil" },
        { name: "Temple noir", slug: "temple-noir" },
        { name: "Terenas", slug: "terenas" },
        { name: "Terokkar", slug: "terokkar" },
        { name: "Terrordar", slug: "terrordar" },
        { name: "The Maelstrom", slug: "the-maelstrom" },
        { name: "The Sha'tar", slug: "the-shatar" },
        { name: "The Venture Co", slug: "the-venture-co" },
        { name: "Theradras", slug: "theradras" },
        { name: "Thrall", slug: "thrall" },
        { name: "Throk'Feroth", slug: "throkferoth" },
        { name: "Thunderhorn", slug: "thunderhorn" },
        { name: "Tichondrius", slug: "tichondrius" },
        { name: "Tirion", slug: "tirion" },
        { name: "Todeswache", slug: "todeswache" },
        { name: "Trollbane", slug: "trollbane" },
        { name: "Turalyon", slug: "turalyon" },
        { name: "Twilight's Hammer", slug: "twilights-hammer" },
        { name: "Twisting Nether", slug: "twisting-nether" },
        { name: "Tyrande", slug: "tyrande" },
        { name: "Uldaman", slug: "uldaman" },
        { name: "Ulduar", slug: "ulduar" },
        { name: "Uldum", slug: "uldum" },
        { name: "Un'Goro", slug: "ungoro" },
        { name: "Varimathras", slug: "varimathras" },
        { name: "Vashj", slug: "vashj" },
        { name: "Vek'lor", slug: "veklor" },
        { name: "Vek'nilash", slug: "veknilash" },
        { name: "Vol'jin", slug: "voljin" },
        { name: "Wildhammer", slug: "wildhammer" },
        { name: "Wrathbringer", slug: "wrathbringer" },
        { name: "Xavius", slug: "xavius" },
        { name: "Ysera", slug: "ysera" },
        { name: "Ysondre", slug: "ysondre" },
        { name: "Zenedar", slug: "zenedar" },
        { name: "Zirkel des Cenarius", slug: "zirkel-des-cenarius" },
        { name: "Zul'jin", slug: "zuljin" },
        { name: "Zuluhed", slug: "zuluhed" },
        { name: "Азурегос", slug: "azuregos" },
        { name: "Борейская тундра", slug: "borean-tundra" },
        { name: "Вечная Песня", slug: "eversong" },
        { name: "Галакронд", slug: "galakrond" },
        { name: "Голдринн", slug: "goldrinn" },
        { name: "Гордунни", slug: "gordunni" },
        { name: "Гром", slug: "grom" },
        { name: "Дракономор", slug: "fordragon" },
        { name: "Король-лич", slug: "lich-king" },
        { name: "Пиратская Бухта", slug: "booty-bay" },
        { name: "Подземье", slug: "deepholm" },
        { name: "Разувий", slug: "razuvious" },
        { name: "Ревущий фьорд", slug: "howling-fjord" },
        { name: "Свежеватель Душ", slug: "soulflayer" },
        { name: "Седогрив", slug: "greymane" },
        { name: "Страж Смерти", slug: "deathguard" },
        { name: "Термоштепсель", slug: "thermaplugg" },
        { name: "Ткач Смерти", slug: "deathweaver" },
        { name: "Черный Шрам", slug: "blackscar" },
        { name: "Ясеневый лес", slug: "ashenvale" },
    ],
}

// Build slug <-> name lookups from REALMS constant
const realmSlugToNameMap = new Map(REALMS.EU.map((r) => [r.slug, r.name]))
const realmNameToSlugMap = new Map(REALMS.EU.map((r) => [r.name.toLowerCase(), r.slug]))

/**
 * Convert realm slug to display name using REALMS constant
 */
export function realmSlugToName(slug: string): string {
    return realmSlugToNameMap.get(slug) ?? slug
}

/**
 * Convert realm display name to API slug using REALMS constant
 * Falls back to basic slugification if not found
 */
export function realmNameToSlug(name: string): string {
    return (
        realmNameToSlugMap.get(name.toLowerCase()) ??
        name.toLowerCase().replace(/\s+/g, "-")
    )
}

import type {
    WowArmorType,
    WowClassName,
    WowItemSlotKey,
} from "@/shared/models/wow.model"

export const classIcon = new Map<WowClassName, string>([
    [
        "Death Knight",
        "https://wow.zamimg.com/images/wow/icons/medium/class_deathknight.jpg",
    ],
    [
        "Demon Hunter",
        "https://wow.zamimg.com/images/wow/icons/medium/class_demonhunter.jpg",
    ],
    ["Druid", "https://wow.zamimg.com/images/wow/icons/medium/class_druid.jpg"],
    ["Evoker", "https://wow.zamimg.com/images/wow/icons/medium/class_evoker.jpg"],
    ["Hunter", "https://wow.zamimg.com/images/wow/icons/medium/class_hunter.jpg"],
    ["Mage", "https://wow.zamimg.com/images/wow/icons/medium/class_mage.jpg"],
    ["Monk", "https://wow.zamimg.com/images/wow/icons/medium/class_monk.jpg"],
    ["Paladin", "https://wow.zamimg.com/images/wow/icons/medium/class_paladin.jpg"],
    ["Priest", "https://wow.zamimg.com/images/wow/icons/medium/class_priest.jpg"],
    ["Rogue", "https://wow.zamimg.com/images/wow/icons/medium/class_rogue.jpg"],
    ["Shaman", "https://wow.zamimg.com/images/wow/icons/medium/class_shaman.jpg"],
    ["Warlock", "https://wow.zamimg.com/images/wow/icons/medium/class_warlock.jpg"],
    ["Warrior", "https://wow.zamimg.com/images/wow/icons/medium/class_warrior.jpg"],
])

export const specIcon = new Map<number, string>([
    [
        250,
        "https://wow.zamimg.com/images/wow/icons/medium/spell_deathknight_bloodpresence.jpg",
    ],
    [
        251,
        "https://wow.zamimg.com/images/wow/icons/medium/spell_deathknight_frostpresence.jpg",
    ],
    [
        252,
        "https://wow.zamimg.com/images/wow/icons/medium/spell_deathknight_unholypresence.jpg",
    ],
    [
        577,
        "https://wow.zamimg.com/images/wow/icons/medium/ability_demonhunter_specdps.jpg",
    ],
    [
        581,
        "https://wow.zamimg.com/images/wow/icons/medium/ability_demonhunter_spectank.jpg",
    ],
    [102, "https://wow.zamimg.com/images/wow/icons/medium/spell_nature_starfall.jpg"],
    [103, "https://wow.zamimg.com/images/wow/icons/medium/ability_druid_catform.jpg"],
    [104, "https://wow.zamimg.com/images/wow/icons/medium/ability_racial_bearform.jpg"],
    [105, "https://wow.zamimg.com/images/wow/icons/medium/spell_nature_healingtouch.jpg"],
    [
        253,
        "https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_bestialdiscipline.jpg",
    ],
    [254, "https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_focusedaim.jpg"],
    [255, "https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_camouflage.jpg"],
    [62, "https://wow.zamimg.com/images/wow/icons/medium/spell_holy_magicalsentry.jpg"],
    [63, "https://wow.zamimg.com/images/wow/icons/medium/spell_fire_firebolt02.jpg"],
    [64, "https://wow.zamimg.com/images/wow/icons/medium/spell_frost_frostbolt02.jpg"],
    [
        268,
        "https://wow.zamimg.com/images/wow/icons/medium/spell_monk_brewmaster_spec.jpg",
    ],
    [
        270,
        "https://wow.zamimg.com/images/wow/icons/medium/spell_monk_mistweaver_spec.jpg",
    ],
    [
        269,
        "https://wow.zamimg.com/images/wow/icons/medium/spell_monk_windwalker_spec.jpg",
    ],
    [65, "https://wow.zamimg.com/images/wow/icons/medium/spell_holy_holybolt.jpg"],
    [
        66,
        "https://wow.zamimg.com/images/wow/icons/medium/ability_paladin_shieldofthetemplar.jpg",
    ],
    [70, "https://wow.zamimg.com/images/wow/icons/medium/spell_holy_auraoflight.jpg"],
    [
        256,
        "https://wow.zamimg.com/images/wow/icons/medium/spell_holy_powerwordshield.jpg",
    ],
    [257, "https://wow.zamimg.com/images/wow/icons/medium/spell_holy_guardianspirit.jpg"],
    [
        258,
        "https://wow.zamimg.com/images/wow/icons/medium/spell_shadow_shadowwordpain.jpg",
    ],
    [259, "https://wow.zamimg.com/images/wow/icons/medium/ability_rogue_eviscerate.jpg"],
    [260, "https://wow.zamimg.com/images/wow/icons/medium/ability_backstab.jpg"],
    [261, "https://wow.zamimg.com/images/wow/icons/medium/ability_stealth.jpg"],
    [262, "https://wow.zamimg.com/images/wow/icons/medium/spell_nature_lightning.jpg"],
    [
        263,
        "https://wow.zamimg.com/images/wow/icons/medium/spell_shaman_improvedstormstrike.jpg",
    ],
    [
        264,
        "https://wow.zamimg.com/images/wow/icons/medium/spell_nature_magicimmunity.jpg",
    ],
    [265, "https://wow.zamimg.com/images/wow/icons/medium/spell_shadow_deathcoil.jpg"],
    [
        266,
        "https://wow.zamimg.com/images/wow/icons/medium/spell_shadow_metamorphosis.jpg",
    ],
    [267, "https://wow.zamimg.com/images/wow/icons/medium/spell_shadow_rainoffire.jpg"],
    [71, "https://wow.zamimg.com/images/wow/icons/medium/ability_warrior_savageblow.jpg"],
    [72, "https://wow.zamimg.com/images/wow/icons/medium/ability_warrior_innerrage.jpg"],
    [
        73,
        "https://wow.zamimg.com/images/wow/icons/medium/ability_warrior_defensivestance.jpg",
    ],
    [
        1467,
        "https://wow.zamimg.com/images/wow/icons/medium/classicon_evoker_devastation.jpg",
    ],
    [
        1468,
        "https://wow.zamimg.com/images/wow/icons/medium/classicon_evoker_preservation.jpg",
    ],
    [
        1473,
        "https://wow.zamimg.com/images/wow/icons/medium/classicon_evoker_augmentation.jpg",
    ],
])

export const itemSlotIcon = new Map<WowItemSlotKey, string>([
    ["head", "https://wow.zamimg.com/images/wow/icons/large/inv_helmet_24.jpg"],
    ["neck", "https://wow.zamimg.com/images/wow/icons/large/inv_jewelry_necklace_07.jpg"],
    ["shoulder", "https://wow.zamimg.com/images/wow/icons/large/inv_shoulder_25.jpg"],
    ["back", "https://wow.zamimg.com/images/wow/icons/large/inv_misc_cape_20.jpg"],
    ["chest", "https://wow.zamimg.com/images/wow/icons/large/inv_chest_chain_05.jpg"],
    ["wrist", "https://wow.zamimg.com/images/wow/icons/large/inv_bracer_07.jpg"],
    ["hands", "https://wow.zamimg.com/images/wow/icons/large/inv_gauntlets_04.jpg"],
    ["waist", "https://wow.zamimg.com/images/wow/icons/large/inv_belt_15.jpg"],
    ["legs", "https://wow.zamimg.com/images/wow/icons/large/inv_pants_08.jpg"],
    ["feet", "https://wow.zamimg.com/images/wow/icons/large/inv_boots_05.jpg"],
    ["finger", "https://wow.zamimg.com/images/wow/icons/large/inv_jewelry_ring_22.jpg"],
    [
        "trinket",
        "https://wow.zamimg.com/images/wow/icons/large/inv_jewelry_talisman_01.jpg",
    ],
    ["main_hand", "https://wow.zamimg.com/images/wow/icons/large/inv_sword_04.jpg"],
    ["off_hand", "https://wow.zamimg.com/images/wow/icons/large/inv_shield_04.jpg"],
    ["omni", "https://wow.zamimg.com/images/wow/icons/large/inv_ability_web_orb.jpg"],
])

export const armorTypesIcon = new Map<WowArmorType, string>([
    ["Cloth", "https://wow.zamimg.com/images/wow/icons/large/inv_chest_cloth_23.jpg"],
    ["Leather", "https://wow.zamimg.com/images/wow/icons/large/inv_chest_leather_09.jpg"],
    ["Mail", "https://wow.zamimg.com/images/wow/icons/large/inv_chest_mail_04.jpg"],
    ["Plate", "https://wow.zamimg.com/images/wow/icons/large/inv_chest_plate04.jpg"],
])

export const encounterIcon = new Map<number, string>([
    // Nerubar Palace
    [2607, "https://wow.zamimg.com/modelviewer/live/webthumbs/npc/12/117772.webp"], // Ulgrax the Devourer
    [2611, "https://wow.zamimg.com/modelviewer/live/webthumbs/npc/165/117669.webp"], // The Bloodbound Horror
    [2599, "https://wow.zamimg.com/modelviewer/live/webthumbs/npc/33/116257.webp"], // Sikran, Captain of the Sureki
    [2609, "https://wow.zamimg.com/modelviewer/live/webthumbs/npc/132/118404.webp"], // Rasha'nan
    [2612, "https://wow.zamimg.com/modelviewer/live/webthumbs/npc/179/118963.webp"], // Broodtwister Ovi'nax
    [2601, "https://wow.zamimg.com/modelviewer/live/webthumbs/npc/186/117946.webp"], // Nexus-Princess Ky'veza
    [
        2608,
        "https://assets2.mythictrap.com/nerubar-palace/background_finals/silken-court-custom.png",
    ], // The Silken Court
    [2602, "https://wow.zamimg.com/modelviewer/beta/webthumbs/npc/213/119253.png"], // Queen Ansurek
    [-67, "https://wow.zamimg.com/modelviewer/classic/webthumbs/npc/55/117047.webp"], // Trash Drop

    // Liberation of Undermine
    [2639, "https://wow.zamimg.com/modelviewer/ptr2/webthumbs/npc/75/122443.webp"], // Vexie and the Geargrinders
    [2640, "https://wow.zamimg.com/modelviewer/ptr2/webthumbs/npc/126/121214.webp"], // Cauldron of Carnage
    [2641, "https://wow.zamimg.com/modelviewer/ptr2/webthumbs/npc/192/122816.webp"], // Rik Reverb
    [2642, "https://wow.zamimg.com/modelviewer/ptr2/webthumbs/npc/240/122352.webp"], // Stix Bunkjunker
    [2653, "https://wow.zamimg.com/modelviewer/ptr2/webthumbs/npc/127/122751.webp"], // Sprocketmonger Lockenstock
    [2644, "https://wow.zamimg.com/modelviewer/ptr2/webthumbs/npc/6/122886.webp"], // The One-Armed Bandit
    [2645, "https://wow.zamimg.com/modelviewer/ptr2/webthumbs/npc/206/124110.webp"], // Mug'Zee, Heads of Security
    [2646, "https://wow.zamimg.com/modelviewer/ptr2/webthumbs/npc/95/126047.webp"], // Chrome King Gallywix
    [-75, "https://wow.zamimg.com/modelviewer/classic/webthumbs/npc/55/117047.webp"], // Trash Drop

    // Manaforge Omega
    [2684, "https://wow.zamimg.com/modelviewer/ptr2/webthumbs/npc/93/127837.webp"], // Plexus Sentinel
    [2686, "https://wow.zamimg.com/modelviewer/ptr2/webthumbs/npc/65/128577.webp"], // Loom'ithar
    [2685, "https://wow.zamimg.com/modelviewer/ptr2/webthumbs/npc/63/128319.webp"], // Soulbinder Naazindhri
    [2687, "https://wow.zamimg.com/modelviewer/ptr2/webthumbs/npc/38/127526.webp"], // Forgeweaver Araz
    [2688, "https://wow.zamimg.com/modelviewer/ptr2/webthumbs/npc/74/127562.webp"], // The Soul Hunters (Adarus)
    [2747, "https://wow.zamimg.com/modelviewer/ptr2/webthumbs/npc/240/127984.webp"], // Fractillus
    [2690, "https://wow.zamimg.com/modelviewer/ptr2/webthumbs/npc/251/125691.webp"], // Nexus-King Salhadaar
    [2691, "https://wow.zamimg.com/modelviewer/ptr2/webthumbs/npc/99/128867.webp"], // Dimensius
    [-78, "https://wow.zamimg.com/modelviewer/classic/webthumbs/npc/55/117047.webp"], // Trash Drop
])

export const currencyIcon = new Map<number, { url: string; name: string }>([
    // TWW SEASON 1
    [
        3116,
        {
            url: "https://wow.zamimg.com/images/wow/icons/large/inv_alchemy_90_reagent_green.jpg",
            name: "Essence of Kajamite",
        },
    ],
    [
        2914,
        {
            url: "https://www.raidbots.com/static/images/icons/56/inv_crestupgrade_xalatath_weathered.png",
            name: "Weathered Harbinger Crest",
        },
    ],
    [
        2915,
        {
            url: "https://www.raidbots.com/static/images/icons/56/inv_crestupgrade_xalatath_carved.png",
            name: "Carved Harbinger Crest",
        },
    ],
    [
        2916,
        {
            url: "https://www.raidbots.com/static/images/icons/56/inv_crestupgrade_xalatath_runed.png",
            name: "Runed Harbinger Crest",
        },
    ],
    [
        2917,
        {
            url: "https://www.raidbots.com/static/images/icons/56/inv_crestupgrade_xalatath_gilded.png",
            name: "Gilded Harbinger Crest",
        },
    ],
    [
        3008,
        {
            url: "https://www.raidbots.com/static/images/icons/56/inv_valorstone_base.png",
            name: "Valorstone",
        },
    ],
    [
        211296,
        {
            url: "https://wow.zamimg.com/images/wow/icons/large/inv_spark_whole_violet.jpg",
            name: "Spark of Omen",
        },
    ],
    // TWW SEASON 2
    [
        2813,
        {
            url: "https://wow.zamimg.com/images/wow/icons/large/inv_ability_web_beam.jpg",
            name: "Harmonized Silk",
        },
    ],
    [
        3107,
        {
            url: "https://wow.zamimg.com/images/wow/icons/large/inv_crestupgrade_undermine_weathered.jpg",
            name: "Weathered Undermine Crest",
        },
    ],
    [
        3108,
        {
            url: "https://wow.zamimg.com/images/wow/icons/medium/inv_crestupgrade_undermine_carved.jpg",
            name: "Carved Undermine Crest",
        },
    ],
    [
        3109,
        {
            url: "https://wow.zamimg.com/images/wow/icons/medium/inv_crestupgrade_undermine_runed.jpg",
            name: "Runed Undermine Crest",
        },
    ],
    [
        3110,
        {
            url: "https://wow.zamimg.com/images/wow/icons/medium/inv_crestupgrade_undermine_gilded.jpg",
            name: "Gilded Undermine Crest",
        },
    ],
    [
        230906,
        {
            url: "https://wow.zamimg.com/images/wow/icons/large/inv_spark_whole_orange.jpg",
            name: "Spark of Fortunes",
        },
    ],
    [
        230936,
        {
            url: "https://wow.zamimg.com/images/wow/icons/large/inv_crestupgrade_xalatath_runed_enchanted.jpg",
            name: "Enchanted Runed Undermine Crest",
        },
    ],
    [
        230935,
        {
            url: "https://wow.zamimg.com/images/wow/icons/large/inv_crestupgrade_xalatath_gilded_enchanted-.jpg",
            name: "Enchanted Gilded Undermine Crest",
        },
    ],
])

import {
    boolean,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    primaryKey,
    real,
    serial,
    text,
    timestamp,
    unique,
    uniqueIndex,
    varchar,
} from "drizzle-orm/pg-core"
import type { GearItem } from "@/shared/models/item.models"
import type { CharAssignmentHighlights } from "@/shared/models/loot.models"
import {
    ARMOR_TYPES,
    CLASSES_NAME,
    ITEM_EQUIPPED_SLOTS_KEY,
    ITEM_SLOTS_KEY,
    MAX_CHARACTER_NAME_LENGTH,
    RAID_DIFF,
    ROLES,
} from "@/shared/wow.consts"

//////////////////////////////////////////////////////////
//                      ENUMS                           //
//////////////////////////////////////////////////////////

export const pgClassEnum = pgEnum("class", CLASSES_NAME)
export const pgRoleEnum = pgEnum("role", ROLES)
export const pgRaidDiffEnum = pgEnum("raid_diff", RAID_DIFF)

export const pgItemArmorTypeEnum = pgEnum("item_armor_type", ARMOR_TYPES)
export const pgItemSlotKeyEnum = pgEnum("item_slot_key", ITEM_SLOTS_KEY)
export const pgItemEquippedSlotKeyEnum = pgEnum(
    "item_equipped_slot_key",
    ITEM_EQUIPPED_SLOTS_KEY
)

//////////////////////////////////////////////////////////
//                   CHARACHTERS                        //
//////////////////////////////////////////////////////////

export const playerTable = pgTable("players", {
    id: varchar("id").primaryKey(),
    name: varchar("name").notNull().unique(),
})

export const charTable = pgTable(
    "characters",
    {
        id: varchar("id").primaryKey(),
        name: varchar("name", { length: MAX_CHARACTER_NAME_LENGTH }).notNull(),
        realm: varchar("realm").notNull(),
        class: pgClassEnum().notNull(),
        role: pgRoleEnum().notNull(),
        main: boolean("main").notNull(), // consider player main char (for future me: dont put any constraint in case any player has more than one "main "char)
        playerId: varchar("player_id")
            .references(() => playerTable.id, { onDelete: "cascade" })
            .notNull(),
    },
    (t) => [
        unique("name_realm").on(t.name, t.realm),
        index("idx_characters_player_id").on(t.playerId),
    ]
)

export const charBlizzardTable = pgTable("characters_blizzard", {
    characterId: varchar("character_id")
        .references(() => charTable.id, { onDelete: "cascade" })
        .primaryKey(),
    race: varchar("race"),
    blizzardCharacterId: integer("blizzard_character_id").notNull(),
    syncedAt: integer("synced_at").notNull(), // unix timestamp when we synced
    lastLoginAt: integer("last_login_at").notNull(), // from Blizzard API
    averageItemLevel: real("average_item_level"),
    equippedItemLevel: real("equipped_item_level"),
    itemsEquipped: jsonb("items_equipped").$type<GearItem[]>().notNull(),
    mountIds: integer("mount_ids").array(), // mount IDs from Blizzard API (null = not synced yet)
})

// Normalized raid encounter progression
export const characterEncounterTable = pgTable(
    "character_encounters",
    {
        id: serial("id").primaryKey(),
        characterId: varchar("character_id")
            .references(() => charTable.id, { onDelete: "cascade" })
            .notNull(),
        bossId: integer("boss_id")
            .references(() => bossTable.id)
            .notNull(),
        difficulty: pgRaidDiffEnum("difficulty").notNull(),
        itemLevel: integer("item_level").notNull(),
        numKills: integer("num_kills").notNull(),
        firstDefeated: timestamp("first_defeated", { withTimezone: true }),
        lastDefeated: timestamp("last_defeated", { withTimezone: true }),
    },
    (t) => [
        unique("char_boss_diff_unique").on(t.characterId, t.bossId, t.difficulty),
        index("idx_character_encounters_char_id").on(t.characterId),
    ]
)

export const bisListTable = pgTable(
    "bis_list",
    {
        id: varchar("id").primaryKey(),
        itemId: integer("item_id")
            .references(() => itemTable.id, { onDelete: "cascade" })
            .notNull(),
        specId: integer("spec_id").notNull(),
    },
    (t) => [unique().on(t.itemId, t.specId)]
)

//////////////////////////////////////////////////////////
//                   SIMULATIONS                        //
//////////////////////////////////////////////////////////

export const droptimizerUpgradesTable = pgTable(
    "droptimizer_upgrades",
    {
        id: varchar("id").primaryKey(),
        dps: integer("dps").notNull(),
        slot: pgItemEquippedSlotKeyEnum("slot").notNull(),
        ilvl: integer("ilvl").notNull(),
        itemId: integer("item_id")
            .references(() => itemTable.id, { onDelete: "cascade" })
            .notNull(),
        tiersetItemId: integer("tierset_item_id").references(() => itemTable.id, {
            onDelete: "set null",
        }),
        catalyzedItemId: integer("catalyzed_item_id").references(() => itemTable.id, {
            onDelete: "set null",
        }),
        droptimizerId: varchar("droptimizer_id")
            .references(() => droptimizerTable.id, { onDelete: "cascade" })
            .notNull(),
    },
    (t) => [
        unique("item_upgrade_in_droptimizer").on(t.itemId, t.droptimizerId), // one item per droptimizer
    ]
)

export const droptimizerTable = pgTable(
    "droptimizers",
    {
        id: varchar("id").primaryKey(),
        url: text("url").notNull().unique(),
        characterId: varchar("character_id")
            .references(() => charTable.id, { onDelete: "cascade" })
            .notNull(),
        dateImported: integer("date_imported").notNull(), // imported unix timestamp in this app
        simDate: integer("sim_date").notNull(), // droptimizer execution unix timestamp
        simFightStyle: varchar("sim_fight_style", { length: 50 }).notNull(),
        simDuration: integer("sim_duration").notNull(),
        simNTargets: integer("sim_n_targets").notNull(),
        simUpgradeEquipped: boolean("sim_upgrade_equipped"),
        raidId: integer("raid_id").notNull(),
        raidDifficulty: pgRaidDiffEnum("raid_difficulty").notNull(),
        characterClass: pgClassEnum("character_class").notNull(),
        characterClassId: integer("character_class_id").notNull(),
        characterSpec: varchar("character_spec").notNull(),
        characterSpecId: integer("character_spec_id").notNull(),
        characterTalents: varchar("character_talents").notNull(),
        weeklyChest: jsonb("weekly_chest").$type<GearItem[]>(),
        currencies:
            jsonb("currencies").$type<{ id: number; type: string; amount: number }[]>(),
        itemsAverageItemLevelEquipped: real("items_average_ilvl_equipped"),
        itemsEquipped: jsonb("items_equipped").$type<GearItem[]>().notNull(),
        itemsInBag: jsonb("items_in_bags").$type<GearItem[]>(),
        tiersetInfo: jsonb("tierset_info").$type<GearItem[]>(),
    },
    (t) => [
        index("idx_droptimizer_char_id_date").on(t.characterId, t.simDate),
        uniqueIndex("droptimizer_char_raid_diff_spec").on(
            t.characterId,
            t.raidId,
            t.raidDifficulty,
            t.characterSpecId
        ),
    ]
)

// SimC Table for import char info without droptimizer
export const simcTable = pgTable(
    "simc",
    {
        id: varchar("id").primaryKey(),
        characterId: varchar("character_id")
            .references(() => charTable.id, { onDelete: "cascade" })
            .notNull(),
        hash: text("hash").notNull(),
        dateGenerated: integer("date_generated").notNull(), // imported unix timestamp in this app
        weeklyChest: jsonb("weekly_chest").$type<GearItem[]>(),
        currencies:
            jsonb("currencies").$type<{ id: number; type: string; amount: number }[]>(),
        itemsEquipped: jsonb("items_equipped").$type<GearItem[]>().notNull(),
        itemsInBag: jsonb("items_in_bags").$type<GearItem[]>(),
        tiersetInfo: jsonb("tierset_info").$type<GearItem[]>(),
    },
    (t) => [
        unique("simc_character_unique").on(t.characterId),
        index("idx_simc_character_id").on(t.characterId),
    ]
)

//////////////////////////////////////////////////////////
//                   RAID SESSION                       //
//////////////////////////////////////////////////////////

export const raidSessionTable = pgTable("raid_sessions", {
    id: varchar("id").primaryKey(),
    name: varchar("name").notNull(),
    raidDate: integer("date").notNull(),
})

export const raidSessionRosterTable = pgTable(
    "raid_sessions_roster",
    {
        raidSessionId: varchar("raid_session_id")
            .references(() => raidSessionTable.id, { onDelete: "cascade" })
            .notNull(),
        charId: varchar("char_id")
            .references(() => charTable.id, { onDelete: "cascade" })
            .notNull(),
    },
    (t) => [primaryKey({ columns: [t.raidSessionId, t.charId] })]
)

export const lootTable = pgTable(
    "loots",
    {
        id: varchar("id").primaryKey(),
        dropDate: integer("drop_date").notNull(),
        itemString: varchar("item_string"),
        gearItem: jsonb("gear_item").$type<GearItem>().notNull(),
        raidDifficulty: pgRaidDiffEnum("raid_difficulty").notNull(),
        charsEligibility: text("chars_eligibility").array().notNull(), // array of IDs referencing RaidSession.Chars
        assignedCharacterId: varchar("assigned_character_id").references(
            () => charTable.id,
            {
                onDelete: "set null",
            }
        ),
        assignedHighlights:
            jsonb("assigned_highlights").$type<CharAssignmentHighlights>(),
        tradedToAssigned: boolean("traded_to_assigned").notNull().default(false),
        raidSessionId: varchar("raid_session_id")
            .references(() => raidSessionTable.id, { onDelete: "cascade" })
            .notNull(),
        itemId: integer("item_id")
            .references(() => itemTable.id)
            .notNull(),
    },
    (t) => [
        index("idx_loots_raid_session").on(
            t.raidSessionId,
            t.assignedCharacterId,
            t.itemId
        ),
    ]
)

export const assignmentTable = pgTable("assignments", {
    id: varchar("id").primaryKey(),
    charId: varchar("char_id")
        .references(() => charTable.id, { onDelete: "cascade" })
        .notNull(),
    lootId: varchar("loot_id")
        .references(() => lootTable.id, { onDelete: "cascade" })
        .unique("loot_assignment")
        .notNull(), // a loot can only be assigned once
})

//////////////////////////////////////////////////////////
//                     JSON DATA                        //
//////////////////////////////////////////////////////////

export const bossTable = pgTable(
    "bosses",
    {
        id: integer("id").primaryKey(), // reuses journal_encounter_id from WoW API
        name: varchar("name", { length: 255 }).notNull(),
        instanceId: integer("instance_id").notNull(),
        instanceName: varchar("instance_name").notNull(),
        instanceType: varchar("instance_type").notNull(),
        order: integer("order").notNull(),
        encounterSlug: varchar("encounter_slug", { length: 50 }),
        raidSlug: varchar("raid_slug", { length: 50 }),
        blizzardEncounterId: integer("blizzard_encounter_id"), // Blizzard API encounter ID
    },
    (t) => [
        index("idx_bosses_instance_id").on(t.instanceId),
        index("idx_bosses_raid_slug").on(t.raidSlug),
    ]
)

// Raid loot items
export const itemTable = pgTable("items", {
    id: integer("id").primaryKey(), // reuses item id from WoW API
    name: varchar("name", { length: 255 }).notNull(),
    ilvlBase: integer("ilvl_base").notNull(),
    ilvlMythic: integer("ilvl_mythic").notNull(),
    ilvlHeroic: integer("ilvl_heroic").notNull(),
    ilvlNormal: integer("ilvl_normal").notNull(),
    slotKey: pgItemSlotKeyEnum("slot_key").notNull(),
    armorType: pgItemArmorTypeEnum("armor_type"),
    itemSubclass: varchar("item_subclass", { length: 50 }),
    token: boolean("token").notNull(), // whether this item generates a tierset piece
    tierset: boolean("tierset").notNull(), // whether this is a tierset item
    veryRare: boolean("very_rare").notNull(),
    specIds: integer("spec_ids").array(),
    classes: text("classes").array(),
    iconName: varchar("icon_name", { length: 255 }).notNull(),
    catalyzed: boolean("catalyzed").notNull().default(false), // only obtainable via catalyst
    sourceId: integer("source_id").notNull(),
    sourceName: varchar("source_name").notNull(),
    sourceType: varchar("source_type").notNull(),
    bossName: varchar("boss_name", { length: 255 }).notNull(), // denormalized for convenience
    season: integer("season").notNull(),
    bossId: integer("boss_id")
        .references(() => bossTable.id)
        .notNull(),
})

// Item Note ( user can write note about item, we isolate in a dedicated table to avoid data loss on item reload)
export const itemNoteTable = pgTable("items_note", {
    itemId: integer("item_id")
        .references(() => itemTable.id, { onDelete: "cascade" })
        .primaryKey(),
    note: varchar("note").notNull(),
})

// Maps tierset items to the token that generates them
// PK is (tokenId, itemId) - the natural key for "token contains item"
// classId is derived from the item's allowableClasses, denormalized for convenience
export const itemToTiersetTable = pgTable(
    "items_to_tierset",
    {
        tokenId: integer("token_id")
            .references(() => itemTable.id, { onDelete: "cascade" })
            .notNull(),
        itemId: integer("item_id").notNull(),
        classId: integer("class_id").notNull(),
    },
    (t) => [primaryKey({ columns: [t.tokenId, t.itemId] })]
)

// Maps items to their catalyzed variants
// catalyzedItemId is the item obtained by catalyzing itemId from a boss (encounterId)
// encounterId enables reverse lookup: catalyzedItemId + encounterId -> original itemId
export const itemToCatalystTable = pgTable(
    "items_to_catalyst",
    {
        itemId: integer("item_id").notNull(),
        encounterId: integer("encounter_id").notNull(),
        catalyzedItemId: integer("catalyzed_item_id").notNull(),
    },
    (t) => [primaryKey({ columns: [t.itemId, t.encounterId, t.catalyzedItemId] })]
)

// Bonus item tracks (upgrade tiers like Hero 1/8, Myth 4/8, etc.)
export const bonusItemTrackTable = pgTable("bonus_item_tracks", {
    id: integer("id").primaryKey(), // Bonus ID (e.g., 10256)
    level: integer("level").notNull(), // Current level (1-8)
    max: integer("max").notNull(), // Max level (6 or 8)
    name: varchar("name", { length: 50 }).notNull(), // "Hero", "Myth", etc.
    fullName: varchar("full_name", { length: 50 }).notNull(), // "Hero 6/6"
    itemLevel: integer("item_level").notNull(),
    maxItemLevel: integer("max_item_level").notNull(),
    season: integer("season").notNull(),
})

//////////////////////////////////////////////////////////
//                 SPREADSHEET LINKS                    //
//////////////////////////////////////////////////////////

export const spreadsheetLinkTable = pgTable("spreadsheet_links", {
    id: varchar("id").primaryKey(),
    title: varchar("title", { length: 100 }).notNull(),
    url: text("url").notNull(),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

import { sql } from "drizzle-orm";
import {
  check,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import type { ModuleContent } from "../content/schema";
import { cadence } from "./enums";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// Versioned study content. Rows are written only by the seed and never deleted.
export const studyModule = pgTable(
  "module",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    key: text("key").notNull(),
    part: smallint("part").notNull(),
    order: smallint("order").notNull(),
    title: text("title").notNull(),
    content: jsonb("content").$type<ModuleContent>().notNull(),
    contentHash: text("content_hash").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("module_slug_unique").on(t.slug), unique("module_key_unique").on(t.key)],
);

export const moduleContentVersion = pgTable(
  "module_content_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => studyModule.id, { onDelete: "restrict" }),
    hash: text("hash").notNull(),
    content: jsonb("content").$type<ModuleContent>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique("module_content_version_module_hash_unique").on(t.moduleId, t.hash)],
);

export const moduleProgress = pgTable(
  "module_progress",
  {
    moduleId: uuid("module_id")
      .primaryKey()
      .references(() => studyModule.id, { onDelete: "restrict" }),
    masteryLevel: smallint("mastery_level").notNull().default(0),
    lastSeenContentHash: text("last_seen_content_hash"),
    updatedAt: updatedAt(),
  },
  (t) => [check("module_progress_mastery_level_check", sql`${t.masteryLevel} between 0 and 5`)],
);

export const routineItem = pgTable(
  "routine_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    cadence: cadence("cadence").notNull(),
    order: smallint("order").notNull(),
    label: text("label").notNull(),
    hint: text("hint"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("routine_item_slug_unique").on(t.slug)],
);

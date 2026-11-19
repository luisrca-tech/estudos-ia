import { sql } from "drizzle-orm";
import {
  char,
  check,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { routineItem, studyModule } from "./content";
import { noteSource, noteType, reviewResult, sessionStatus } from "./enums";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const studySession = pgTable(
  "study_session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => studyModule.id, { onDelete: "restrict" }),
    plannedMinutes: smallint("planned_minutes").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    status: sessionStatus("status").notNull().default("running"),
  },
  (t) => [
    // At most one running session at any time.
    uniqueIndex("study_session_single_running_idx")
      .on(t.status)
      .where(sql`${t.status} = 'running'`),
    index("study_session_module_idx").on(t.moduleId, t.startedAt),
  ],
);

export const importBatch = pgTable("import_batch", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileName: text("file_name").notNull(),
  format: text("format").notNull(),
  fileHash: text("file_hash").notNull(),
  notesCreated: integer("notes_created").notNull(),
  notesSkipped: integer("notes_skipped").notNull(),
  createdAt: createdAt(),
});

export const note = pgTable(
  "note",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => studyModule.id, { onDelete: "restrict" }),
    sessionId: uuid("session_id").references(() => studySession.id, { onDelete: "set null" }),
    type: noteType("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    recallPrompt: text("recall_prompt"),
    evidenceGrade: char("evidence_grade", { length: 1 }),
    sourceUrl: text("source_url"),
    source: noteSource("source").notNull().default("app"),
    importBatchId: uuid("import_batch_id").references(() => importBatch.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("note_module_created_idx").on(t.moduleId, t.createdAt),
    index("note_type_idx").on(t.type),
    check(
      "note_evidence_grade_check",
      sql`${t.evidenceGrade} is null or ${t.evidenceGrade} in ('A', 'B', 'C', 'D', 'E')`,
    ),
  ],
);

export const reviewSchedule = pgTable(
  "review_schedule",
  {
    noteId: uuid("note_id")
      .primaryKey()
      .references(() => note.id, { onDelete: "cascade" }),
    step: smallint("step").notNull().default(0),
    dueOn: date("due_on", { mode: "string" }),
    graduatedAt: timestamp("graduated_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("review_schedule_due_on_idx").on(t.dueOn)],
);

export const reviewLog = pgTable(
  "review_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    noteId: uuid("note_id")
      .notNull()
      .references(() => note.id, { onDelete: "cascade" }),
    stepBefore: smallint("step_before").notNull(),
    result: reviewResult("result").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("review_log_note_idx").on(t.noteId)],
);

export const routineCheck = pgTable(
  "routine_check",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    routineItemId: uuid("routine_item_id")
      .notNull()
      .references(() => routineItem.id, { onDelete: "restrict" }),
    periodKey: text("period_key").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("routine_check_item_period_unique").on(t.routineItemId, t.periodKey)],
);

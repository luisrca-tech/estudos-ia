import { note, reviewSchedule, studyModule } from "@estudos-ia/db/schema/index";
import { and, eq, isNull, lte } from "drizzle-orm";

import { orderDueReviews, recallPromptFor } from "../rules/review";
import { today } from "../rules/time";
import { moduleRef, trackPosition, type Db } from "./shared";

/** Queue of the day in review order, without note bodies. Archived modules still count. */
export async function loadDueReviews(db: Db, now: Date) {
  const rows = await db
    .select({
      noteId: note.id,
      type: note.type,
      title: note.title,
      recallPrompt: note.recallPrompt,
      createdAt: note.createdAt,
      step: reviewSchedule.step,
      dueOn: reviewSchedule.dueOn,
      module: moduleRef,
    })
    .from(reviewSchedule)
    .innerJoin(note, eq(note.id, reviewSchedule.noteId))
    .innerJoin(studyModule, eq(studyModule.id, note.moduleId))
    .where(and(isNull(reviewSchedule.graduatedAt), lte(reviewSchedule.dueOn, today(now))));

  const ordered = orderDueReviews(
    rows.flatMap((row) =>
      row.dueOn === null
        ? []
        : [{ ...row, dueOn: row.dueOn, moduleId: row.module.id, moduleOrder: trackPosition(row.module) }],
    ),
    now,
  );

  return ordered.map((row) => ({
    noteId: row.noteId,
    noteType: row.type,
    prompt: recallPromptFor(row, row.module.kicker),
    moduleKicker: row.module.kicker,
    moduleTitle: row.module.title,
    moduleSlug: row.module.slug,
    step: row.step,
    dueOn: row.dueOn,
    overdue: row.overdue,
  }));
}

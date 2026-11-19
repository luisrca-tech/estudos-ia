import { note, studyModule, studySession } from "@estudos-ia/db/schema/index";
import { and, desc, eq, gte, inArray } from "drizzle-orm";

import {
  alertWindowStart,
  sessionCounts,
  summaryStatus,
  type AlertNote,
} from "../rules/summary-alerts";
import { moduleRef, type Db } from "./shared";

/** A session whose end passed this long ago was missed by the client (tab closed). */
const AUTO_COMPLETE_GRACE_MS = 60 * 1000;

const sessionWithModule = {
  id: studySession.id,
  moduleId: studySession.moduleId,
  plannedMinutes: studySession.plannedMinutes,
  startedAt: studySession.startedAt,
  endsAt: studySession.endsAt,
  endedAt: studySession.endedAt,
  durationSeconds: studySession.durationSeconds,
  status: studySession.status,
  module: moduleRef,
};

export function plannedSeconds(session: { startedAt: Date; endsAt: Date }): number {
  return Math.round((session.endsAt.getTime() - session.startedAt.getTime()) / 1000);
}

async function completeAtPlannedEnd(db: Db, session: { id: string; startedAt: Date; endsAt: Date }) {
  await db
    .update(studySession)
    .set({ status: "completed", endedAt: session.endsAt, durationSeconds: plannedSeconds(session) })
    .where(and(eq(studySession.id, session.id), eq(studySession.status, "running")));
}

/**
 * The running session, or null. A running session that ended more than
 * `graceMs` ago is completed on the spot with ended_at = ends_at.
 */
export async function loadActiveSession(db: Db, now: Date, graceMs = AUTO_COMPLETE_GRACE_MS) {
  const [running] = await db
    .select(sessionWithModule)
    .from(studySession)
    .innerJoin(studyModule, eq(studyModule.id, studySession.moduleId))
    .where(eq(studySession.status, "running"))
    .limit(1);
  if (!running) return null;
  if (now.getTime() - running.endsAt.getTime() > graceMs) {
    await completeAtPlannedEnd(db, running);
    return null;
  }
  return running;
}

export async function listSessions(db: Db, options: { moduleId?: string; limit: number; since?: Date }) {
  return db
    .select(sessionWithModule)
    .from(studySession)
    .innerJoin(studyModule, eq(studyModule.id, studySession.moduleId))
    .where(
      and(
        options.moduleId ? eq(studySession.moduleId, options.moduleId) : undefined,
        options.since ? gte(studySession.startedAt, options.since) : undefined,
      ),
    )
    .orderBy(desc(studySession.startedAt))
    .limit(options.limit);
}

/** App-written summaries of the given modules: the only notes that can cover a session. */
export async function loadSummaryNotes(db: Db, moduleIds: string[]): Promise<AlertNote[]> {
  if (moduleIds.length === 0) return [];
  return db
    .select({
      moduleId: note.moduleId,
      sessionId: note.sessionId,
      type: note.type,
      source: note.source,
      createdAt: note.createdAt,
    })
    .from(note)
    .where(and(inArray(note.moduleId, moduleIds), eq(note.type, "summary"), eq(note.source, "app")));
}

/** Sessions with their derived summary state (spec 6.1). */
export async function listSessionsWithSummary(
  db: Db,
  now: Date,
  options: { moduleId?: string; limit: number; since?: Date },
) {
  const sessions = await listSessions(db, options);
  const notes = await loadSummaryNotes(db, [...new Set(sessions.map((session) => session.moduleId))]);
  return sessions.map((session) => ({ ...session, summary: summaryStatus(session, notes, now) }));
}

/** Counting sessions inside the alert window that still lack a summary. */
export async function loadSummaryAlerts(db: Db, now: Date) {
  const sessions = await listSessionsWithSummary(db, now, {
    limit: 500,
    // started_at <= ended_at, and the longest session is 3 h.
    since: new Date(alertWindowStart(now).getTime() - 4 * 60 * 60 * 1000),
  });
  const waiting = sessions.filter((session) => sessionCounts(session));
  return {
    overdue: waiting.filter((session) => session.summary.state === "overdue"),
    pending: waiting.filter((session) => session.summary.state === "pending"),
  };
}

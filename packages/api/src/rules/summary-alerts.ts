const HOUR_MS = 60 * 60 * 1000;

/** Sessions shorter than this never ask for a summary. */
export const MIN_COUNTING_SECONDS = 300;
export const SUMMARY_DEADLINE_HOURS = 24;
/** Sessions that ended before this window never raise alerts. */
export const ALERT_WINDOW_DAYS = 30;

export type AlertSession = {
  id: string;
  moduleId: string;
  status: "running" | "completed" | "cancelled";
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
};

export type AlertNote = {
  moduleId: string;
  sessionId: string | null;
  type: "summary" | "question" | "decision" | "evidence";
  source: "app" | "html_import";
  createdAt: Date;
};

export type SummaryState = "none" | "covered" | "pending" | "overdue";

export type SummaryStatus = {
  state: SummaryState;
  /** ended_at + 24 running hours; null when the session does not count. */
  deadline: Date | null;
  /** Hours left when pending (rounded up) or hours late when overdue (rounded down). */
  hours: number | null;
};

type CountingSession = AlertSession & { endedAt: Date; durationSeconds: number };

export function sessionCounts(session: AlertSession): session is CountingSession {
  return (
    session.status === "completed" &&
    session.endedAt !== null &&
    session.durationSeconds !== null &&
    session.durationSeconds >= MIN_COUNTING_SECONDS
  );
}

export function alertWindowStart(now: Date): Date {
  return new Date(now.getTime() - ALERT_WINDOW_DAYS * 24 * HOUR_MS);
}

function summaryDeadline(session: CountingSession): Date {
  return new Date(session.endedAt.getTime() + SUMMARY_DEADLINE_HOURS * HOUR_MS);
}

function isCovered(session: CountingSession, deadline: Date, notes: AlertNote[]): boolean {
  return notes.some((note) => {
    // Imported notes are old text: they never pay for a new session.
    if (note.type !== "summary" || note.source !== "app") return false;
    if (note.sessionId === session.id) return true;
    return (
      note.moduleId === session.moduleId &&
      note.createdAt.getTime() >= session.startedAt.getTime() &&
      note.createdAt.getTime() <= deadline.getTime()
    );
  });
}

/** Derived on read: there is no alert table, so alerts can never drift from the data. */
export function summaryStatus(session: AlertSession, notes: AlertNote[], now: Date): SummaryStatus {
  if (!sessionCounts(session) || session.endedAt.getTime() < alertWindowStart(now).getTime()) {
    return { state: "none", deadline: null, hours: null };
  }
  const deadline = summaryDeadline(session);
  if (isCovered(session, deadline, notes)) {
    return { state: "covered", deadline, hours: null };
  }
  const remainingMs = deadline.getTime() - now.getTime();
  if (remainingMs > 0) {
    return { state: "pending", deadline, hours: Math.ceil(remainingMs / HOUR_MS) };
  }
  return { state: "overdue", deadline, hours: Math.floor((now.getTime() - deadline.getTime()) / HOUR_MS) };
}

/**
 * A summary created without a session is linked to the most recent counting
 * session of the same module that is still waiting for one.
 */
export function findSessionToLink<T extends AlertSession>(
  sessions: T[],
  notes: AlertNote[],
  moduleId: string,
  now: Date,
): T | null {
  const waiting = sessions
    .filter((session) => session.moduleId === moduleId)
    .filter((session) => {
      const { state } = summaryStatus(session, notes, now);
      return state === "pending" || state === "overdue";
    })
    .sort((a, b) => (b.endedAt?.getTime() ?? 0) - (a.endedAt?.getTime() ?? 0));
  return waiting[0] ?? null;
}

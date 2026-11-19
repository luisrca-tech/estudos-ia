import { describe, expect, it } from "vitest";

import {
  ALERT_WINDOW_DAYS,
  findSessionToLink,
  requiresSummary,
  sessionCounts,
  summaryStatus,
  type AlertNote,
  type AlertSession,
} from "./summary-alerts";

const at = (iso: string) => new Date(iso);

const session = (overrides: Partial<AlertSession> = {}): AlertSession => ({
  id: "s1",
  moduleId: "m2",
  status: "completed",
  startedAt: at("2026-11-19T12:00:00Z"),
  endedAt: at("2026-11-19T12:25:00Z"),
  durationSeconds: 1500,
  ...overrides,
});

const note = (overrides: Partial<AlertNote> = {}): AlertNote => ({
  moduleId: "m2",
  sessionId: null,
  type: "summary",
  source: "app",
  createdAt: at("2026-11-19T13:00:00Z"),
  ...overrides,
});

describe("requiresSummary", () => {
  it("asks for a summary only from 5 minutes of real duration on", () => {
    expect(requiresSummary(null)).toBe(false);
    expect(requiresSummary(0)).toBe(false);
    expect(requiresSummary(299)).toBe(false);
    expect(requiresSummary(300)).toBe(true);
    expect(requiresSummary(1500)).toBe(true);
  });
});

describe("sessionCounts (acceptance 20)", () => {
  it("counts only completed sessions of at least 5 minutes", () => {
    expect(sessionCounts(session())).toBe(true);
    expect(sessionCounts(session({ durationSeconds: 300 }))).toBe(true);
    expect(sessionCounts(session({ durationSeconds: 299 }))).toBe(false);
    expect(sessionCounts(session({ status: "cancelled" }))).toBe(false);
    expect(sessionCounts(session({ status: "running", endedAt: null, durationSeconds: null }))).toBe(false);
  });

  it("cancelled or short sessions never generate a charge", () => {
    const later = at("2026-11-25T12:00:00Z");
    expect(summaryStatus(session({ status: "cancelled" }), [], later).state).toBe("none");
    expect(summaryStatus(session({ durationSeconds: 120 }), [], later).state).toBe("none");
  });
});

describe("summaryStatus (spec 6.1)", () => {
  it("is pending before the 24h deadline, with hours left", () => {
    const status = summaryStatus(session(), [], at("2026-11-19T14:25:00Z"));
    expect(status.state).toBe("pending");
    expect(status.deadline).toEqual(at("2026-11-20T12:25:00Z"));
    expect(status.hours).toBe(22);
  });

  it("is overdue from the deadline on (24 running hours, not calendar days)", () => {
    expect(summaryStatus(session(), [], at("2026-11-20T12:24:59Z")).state).toBe("pending");
    const atDeadline = summaryStatus(session(), [], at("2026-11-20T12:25:00Z"));
    expect(atDeadline.state).toBe("overdue");
    expect(atDeadline.hours).toBe(0);
    // ended_at moved to 25h ago (acceptance 19).
    expect(summaryStatus(session(), [], at("2026-11-20T13:25:00Z"))).toMatchObject({ state: "overdue", hours: 1 });
  });

  it("is covered by a summary linked to the session, even long after the deadline", () => {
    const late = note({ sessionId: "s1", createdAt: at("2026-11-25T10:00:00Z") });
    expect(summaryStatus(session(), [late], at("2026-11-25T11:00:00Z")).state).toBe("covered");
  });

  it("is covered by an unlinked summary of the same module inside the window", () => {
    expect(summaryStatus(session(), [note()], at("2026-11-22T00:00:00Z")).state).toBe("covered");
    // During the session itself also counts (started_at <= created_at).
    expect(summaryStatus(session(), [note({ createdAt: at("2026-11-19T12:10:00Z") })], at("2026-11-22T00:00:00Z")).state).toBe("covered");
  });

  it("is not covered by notes outside the window, of another module, or of another type", () => {
    const now = at("2026-11-22T00:00:00Z");
    expect(summaryStatus(session(), [note({ createdAt: at("2026-11-19T11:59:59Z") })], now).state).toBe("overdue");
    expect(summaryStatus(session(), [note({ createdAt: at("2026-11-20T12:25:01Z") })], now).state).toBe("overdue");
    expect(summaryStatus(session(), [note({ moduleId: "m3" })], now).state).toBe("overdue");
    expect(summaryStatus(session(), [note({ type: "question" })], now).state).toBe("overdue");
  });

  it("an imported note never covers a session", () => {
    const imported = note({ source: "html_import" });
    const linkedImport = note({ source: "html_import", sessionId: "s1" });
    expect(summaryStatus(session(), [imported, linkedImport], at("2026-11-22T00:00:00Z")).state).toBe("overdue");
  });

  it("ignores sessions that ended before the 30-day window", () => {
    expect(ALERT_WINDOW_DAYS).toBe(30);
    const old = session({ startedAt: at("2026-10-01T12:00:00Z"), endedAt: at("2026-10-01T12:25:00Z") });
    expect(summaryStatus(old, [], at("2026-11-19T12:00:00Z")).state).toBe("none");
    const inside = session({ startedAt: at("2026-10-20T12:00:00Z"), endedAt: at("2026-10-20T12:25:00Z") });
    expect(summaryStatus(inside, [], at("2026-11-19T12:00:00Z")).state).toBe("overdue");
  });
});

describe("findSessionToLink", () => {
  const now = at("2026-11-21T00:00:00Z");

  it("picks the most recent counting session of the module that still lacks a summary", () => {
    const older = session({ id: "old", startedAt: at("2026-11-18T12:00:00Z"), endedAt: at("2026-11-18T12:25:00Z") });
    const newer = session({ id: "new", startedAt: at("2026-11-20T12:00:00Z"), endedAt: at("2026-11-20T12:25:00Z") });
    const other = session({ id: "other", moduleId: "m3", startedAt: at("2026-11-20T20:00:00Z"), endedAt: at("2026-11-20T20:25:00Z") });
    expect(findSessionToLink([older, newer, other], [], "m2", now)?.id).toBe("new");
  });

  it("skips covered, cancelled and short sessions", () => {
    const covered = session({ id: "covered", startedAt: at("2026-11-20T12:00:00Z"), endedAt: at("2026-11-20T12:25:00Z") });
    const cancelled = session({ id: "cancelled", status: "cancelled", startedAt: at("2026-11-20T15:00:00Z"), endedAt: at("2026-11-20T15:25:00Z") });
    const overdue = session({ id: "overdue", startedAt: at("2026-11-18T12:00:00Z"), endedAt: at("2026-11-18T12:25:00Z") });
    const notes = [note({ sessionId: "covered", createdAt: at("2026-11-20T13:00:00Z") })];
    expect(findSessionToLink([covered, cancelled, overdue], notes, "m2", now)?.id).toBe("overdue");
  });

  it("returns null when nothing is waiting for a summary", () => {
    expect(findSessionToLink([], [], "m2", now)).toBeNull();
    expect(findSessionToLink([session({ status: "cancelled" })], [], "m2", now)).toBeNull();
  });
});

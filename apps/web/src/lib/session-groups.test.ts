import { describe, expect, it } from "vitest";

import { focusLabel, groupSessionsByDay, needsSummary, weekSummary } from "./session-groups";

const sp = (date: string, time: string) => new Date(`${date}T${time}:00-03:00`);
const now = sp("2026-11-19", "10:30");

type S = Parameters<typeof weekSummary>[0][number] & { id: string; summary: { state: string } };
const session = (id: string, date: string, time: string, extra: Partial<S> = {}): S => ({
  id,
  startedAt: sp(date, time),
  status: "completed",
  durationSeconds: 1500,
  summary: { state: "covered" },
  ...extra,
});

describe("groupSessionsByDay", () => {
  it("groups by São Paulo calendar day and keeps the input order", () => {
    const sessions = [
      session("a", "2026-11-19", "10:12"),
      session("b", "2026-11-19", "09:40"),
      session("c", "2026-11-18", "23:50"),
      session("d", "2026-11-17", "14:10"),
    ];
    const groups = groupSessionsByDay(sessions, now);
    expect(groups.map((group) => [group.day, group.sessions.map((s) => s.id)])).toEqual([
      ["2026-11-19", ["a", "b"]],
      ["2026-11-18", ["c"]],
      ["2026-11-17", ["d"]],
    ]);
  });

  it("labels today and the other days like the board", () => {
    const groups = groupSessionsByDay([session("a", "2026-11-19", "10:12"), session("c", "2026-11-18", "08:30")], now);
    expect(groups.map((group) => group.label)).toEqual(["Hoje, quinta 19/11", "Quarta, 18/11"]);
  });

  it("a session at 23:50 in São Paulo stays on that day even though it is the next day in UTC", () => {
    const [group] = groupSessionsByDay([session("late", "2026-11-18", "23:50")], now);
    expect(group?.day).toBe("2026-11-18");
  });
});

describe("weekSummary", () => {
  it("counts completed sessions and focus time in the current ISO week", () => {
    const sessions = [
      session("a", "2026-11-19", "09:40", { durationSeconds: 1500 }),
      session("b", "2026-11-16", "07:30", { durationSeconds: 1500 }),
      session("c", "2026-11-18", "07:58", { status: "cancelled", durationSeconds: null }),
      session("d", "2026-11-19", "10:12", { status: "running", durationSeconds: null }),
      session("e", "2026-11-15", "19:00", { durationSeconds: 1500 }), // previous week (Sunday)
    ];
    expect(weekSummary(sessions, now)).toEqual({ completed: 2, focusSeconds: 3000 });
  });
});

describe("needsSummary and focusLabel", () => {
  it("only pending and overdue sessions are 'Sem resumo'", () => {
    expect(needsSummary({ summary: { state: "pending" } })).toBe(true);
    expect(needsSummary({ summary: { state: "overdue" } })).toBe(true);
    expect(needsSummary({ summary: { state: "covered" } })).toBe(false);
    expect(needsSummary({ summary: { state: "none" } })).toBe(false);
  });

  it("shows real over planned minutes, with zero padding like the board", () => {
    expect(focusLabel({ durationSeconds: 1500, plannedMinutes: 25, startedAt: now, status: "completed" }, now)).toEqual({ text: "25 / 25 min", ratio: 1 });
    expect(focusLabel({ durationSeconds: 540, plannedMinutes: 25, startedAt: now, status: "cancelled" }, now)).toEqual({ text: "09 / 25 min", ratio: 0.36 });
    const running = focusLabel({ durationSeconds: null, plannedMinutes: 25, startedAt: sp("2026-11-19", "10:24"), status: "running" }, now);
    expect(running).toEqual({ text: "06 / 25 min", ratio: 0.24 });
    expect(focusLabel({ durationSeconds: null, plannedMinutes: 25, startedAt: now, status: "cancelled" }, now).text).toBe("– / 25 min");
  });
});

import { describe, expect, it } from "vitest";

import {
  applyReview,
  GAPS,
  initialSchedule,
  isDue,
  orderDueReviews,
  recallPromptFor,
  staggeredDueDates,
  type ReviewState,
} from "./review";

const sp = (date: string, time = "12:00:00") => new Date(`${date}T${time}-03:00`);

describe("review schedule (acceptance 21 and 22)", () => {
  it("uses cumulative 1, 3, 7, 21 day intervals as gaps", () => {
    expect(GAPS).toEqual([1, 2, 4, 14]);
  });

  it("a note created today is first due tomorrow, never today", () => {
    const created = sp("2026-11-19", "23:30:00");
    const schedule = initialSchedule(created);
    expect(schedule).toEqual({ step: 0, dueOn: "2026-11-20", graduatedAt: null });
    expect(isDue(schedule, created)).toBe(false);
    expect(isDue(schedule, sp("2026-11-20", "00:00:00"))).toBe(true);
    expect(isDue(schedule, sp("2026-11-25"))).toBe(true);
  });

  it("recalled on every due day lands on D+1, D+3, D+7, D+21, then graduates", () => {
    let state: ReviewState = initialSchedule(sp("2026-11-19"));
    const dueDates: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      dueDates.push(state.dueOn!);
      state = applyReview(state, "recalled", sp(state.dueOn!));
    }
    expect(dueDates).toEqual(["2026-11-20", "2026-11-22", "2026-11-26", "2026-12-10"]);
    expect(state.step).toBe(4);
    expect(state.dueOn).toBeNull();
    expect(state.graduatedAt).toEqual(sp("2026-12-10"));
    expect(isDue(state, sp("2027-01-01"))).toBe(false);
  });

  it("forgot at any step schedules tomorrow with step 0", () => {
    const now = sp("2026-12-01");
    for (const step of [0, 1, 2, 3]) {
      expect(applyReview({ step, dueOn: "2026-12-01", graduatedAt: null }, "forgot", now)).toEqual({
        step: 0,
        dueOn: "2026-12-02",
        graduatedAt: null,
      });
    }
  });

  it("a late review pushes the following ones (gaps count from the review day)", () => {
    const state = applyReview({ step: 0, dueOn: "2026-11-20", graduatedAt: null }, "recalled", sp("2026-11-25"));
    expect(state).toEqual({ step: 1, dueOn: "2026-11-27", graduatedAt: null });
  });

  it("review day is computed in São Paulo time", () => {
    // 23:30 on Nov 20 in São Paulo is already Nov 21 in UTC.
    const state = applyReview({ step: 0, dueOn: "2026-11-20", graduatedAt: null }, "recalled", new Date("2026-11-21T02:30:00Z"));
    expect(state.dueOn).toBe("2026-11-22");
  });

  it("refuses to grade a graduated note", () => {
    expect(() => applyReview({ step: 4, dueOn: null, graduatedAt: sp("2026-12-10") }, "recalled", sp("2026-12-11"))).toThrow();
  });
});

describe("orderDueReviews (acceptance 23)", () => {
  const now = sp("2026-11-19");
  const item = (noteId: string, moduleId: string, moduleOrder: number, dueOn: string, createdAt: string) => ({
    noteId,
    moduleId,
    moduleOrder,
    dueOn,
    createdAt: sp(createdAt),
  });

  it("interleaves modules: m1, m1, m3 becomes m1, m3, m1", () => {
    const ordered = orderDueReviews(
      [
        item("m1-a", "m1", 1, "2026-11-19", "2026-11-10"),
        item("m1-b", "m1", 1, "2026-11-19", "2026-11-11"),
        item("m3-a", "m3", 3, "2026-11-19", "2026-11-12"),
      ],
      now,
    );
    expect(ordered.map((entry) => entry.moduleId)).toEqual(["m1", "m3", "m1"]);
    expect(ordered.map((entry) => entry.noteId)).toEqual(["m1-a", "m3-a", "m1-b"]);
  });

  it("puts overdue reviews first, each group interleaved on its own", () => {
    const ordered = orderDueReviews(
      [
        item("today-m1", "m1", 1, "2026-11-19", "2026-11-01"),
        item("late-m3-new", "m3", 3, "2026-11-18", "2026-11-05"),
        item("late-m3-old", "m3", 3, "2026-11-15", "2026-11-06"),
        item("late-m2", "m2", 2, "2026-11-17", "2026-11-02"),
        item("today-m2", "m2", 2, "2026-11-19", "2026-11-03"),
      ],
      now,
    );
    expect(ordered.map((entry) => entry.noteId)).toEqual([
      "late-m2",
      "late-m3-old",
      "late-m3-new",
      "today-m1",
      "today-m2",
    ]);
    expect(ordered.map((entry) => entry.overdue)).toEqual([true, true, true, false, false]);
  });

  it("breaks due date ties by creation time", () => {
    const ordered = orderDueReviews(
      [
        item("second", "m1", 1, "2026-11-19", "2026-11-12"),
        item("first", "m1", 1, "2026-11-19", "2026-11-11"),
      ],
      now,
    );
    expect(ordered.map((entry) => entry.noteId)).toEqual(["first", "second"]);
  });
});

describe("recallPromptFor", () => {
  const kicker = "Módulo 6 · O mais importante";

  it("prefers the note's own recall prompt", () => {
    expect(recallPromptFor({ type: "summary", title: "Juiz binário", recallPrompt: "  Por que binário?  " }, kicker)).toBe("Por que binário?");
  });

  it("falls back per note type", () => {
    expect(recallPromptFor({ type: "summary", title: "Juiz binário", recallPrompt: null }, kicker)).toBe(
      'Explique com suas palavras: "Juiz binário" (Módulo 6 · O mais importante).',
    );
    expect(recallPromptFor({ type: "question", title: "Quando usar RAG?", recallPrompt: "  " }, kicker)).toBe("Quando usar RAG?");
    expect(recallPromptFor({ type: "decision", title: "Cascata", recallPrompt: null }, kicker)).toBe(
      'Que decisão você tomou sobre "Cascata", e o que te faria mudar de ideia?',
    );
    expect(recallPromptFor({ type: "evidence", title: "LIMA", recallPrompt: null }, kicker)).toBe(
      'Qual é a evidência de "LIMA", e com que grau (A–E)?',
    );
  });
});

describe("staggeredDueDates (import, spec 6.5)", () => {
  it("15 imported notes get at most 3 first reviews per day, starting tomorrow", () => {
    const dates = staggeredDueDates(15, sp("2026-11-19"));
    expect(dates).toHaveLength(15);
    expect(dates.slice(0, 3)).toEqual(["2026-11-20", "2026-11-20", "2026-11-20"]);
    expect(dates.slice(3, 6)).toEqual(["2026-11-21", "2026-11-21", "2026-11-21"]);
    expect(dates[14]).toBe("2026-11-24");
    const perDay = new Map<string, number>();
    for (const date of dates) perDay.set(date, (perDay.get(date) ?? 0) + 1);
    expect(Math.max(...perDay.values())).toBe(3);
    expect(perDay.size).toBe(5);
  });

  it("handles partial last days and empty batches", () => {
    expect(staggeredDueDates(4, sp("2026-11-19"))).toEqual(["2026-11-20", "2026-11-20", "2026-11-20", "2026-11-21"]);
    expect(staggeredDueDates(0, sp("2026-11-19"))).toEqual([]);
  });
});

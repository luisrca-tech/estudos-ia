import { describe, expect, it } from "vitest";

import {
  degreeCells,
  goalProgress,
  nextReviewLabel,
  overdueLabel,
  rulerTicks,
  suggestionReason,
  timerPhase,
} from "./study-labels";

const sp = (date: string, time = "12:00") => new Date(`${date}T${time}:00-03:00`);

describe("nextReviewLabel (uses the tested GAPS)", () => {
  it("tells when a recalled note comes back", () => {
    expect(nextReviewLabel(0)).toBe("próxima em 2 dias");
    expect(nextReviewLabel(1)).toBe("próxima em 4 dias");
    expect(nextReviewLabel(2)).toBe("próxima em 14 dias");
    expect(nextReviewLabel(3)).toBe("última revisão");
  });
});

describe("overdueLabel", () => {
  it("counts calendar days late", () => {
    expect(overdueLabel("2026-11-18", sp("2026-11-19"))).toBe("atrasada 1 dia");
    expect(overdueLabel("2026-11-15", sp("2026-11-19"))).toBe("atrasada 4 dias");
    expect(overdueLabel("2026-11-19", sp("2026-11-19"))).toBeNull();
  });
});

describe("suggestionReason", () => {
  const now = sp("2026-11-19", "10:00");
  it("explains the suggestion with the step and the last session", () => {
    expect(suggestionReason({ masteryLevel: 1, lastSessionAt: sp("2026-11-17", "09:00") }, now)).toBe(
      "Sugerido: degrau 1, última sessão há 2 dias.",
    );
    expect(suggestionReason({ masteryLevel: 2, lastSessionAt: sp("2026-11-18", "23:00") }, now)).toBe(
      "Sugerido: degrau 2, última sessão ontem.",
    );
    expect(suggestionReason({ masteryLevel: 0, lastSessionAt: sp("2026-11-19", "08:00") }, now)).toBe(
      "Sugerido: degrau 0, última sessão hoje.",
    );
    expect(suggestionReason({ masteryLevel: 0, lastSessionAt: null }, now)).toBe("Sugerido: degrau 0, nenhuma sessão ainda.");
  });
});

describe("timer dock", () => {
  it("has a last-minute phase and a finished phase", () => {
    expect(timerPhase(600)).toBe("running");
    expect(timerPhase(61)).toBe("running");
    expect(timerPhase(60)).toBe("last-minute");
    expect(timerPhase(0.5)).toBe("last-minute");
    expect(timerPhase(0)).toBe("finished");
    expect(timerPhase(-3)).toBe("finished");
  });

  it("puts one tick per minute and a taller one every 5", () => {
    const ticks = rulerTicks(25);
    expect(ticks).toHaveLength(24);
    expect(ticks[0]).toEqual({ leftPct: 4, major: false });
    expect(ticks[4]).toEqual({ leftPct: 20, major: true });
    expect(ticks.filter((tick) => tick.major)).toHaveLength(4);
    expect(rulerTicks(1)).toEqual([]);
  });
});

describe("module map", () => {
  it("fills the five cells in accent up to step 2 and in green from 3", () => {
    expect(degreeCells(0)).toEqual(["empty", "empty", "empty", "empty", "empty"]);
    expect(degreeCells(2)).toEqual(["accent", "accent", "empty", "empty", "empty"]);
    expect(degreeCells(3)).toEqual(["success", "success", "success", "empty", "empty"]);
    expect(degreeCells(5)).toEqual(["success", "success", "success", "success", "success"]);
  });

  it("counts progress toward the goal", () => {
    expect(goalProgress([0, 1, 3, 4, 5, 2])).toEqual({ total: 6, atGoal: 3, atFour: 2, started: 5 });
  });
});

import { describe, expect, it } from "vitest";

import { buildRoutineHistory, isPeriodComplete, periodKey, recentPeriodKeys } from "./periods";

const sp = (date: string, time = "12:00:00") => new Date(`${date}T${time}-03:00`);

describe("periodKey (acceptance 25)", () => {
  it("daily key uses the São Paulo calendar day", () => {
    // 23:30 on the 18th in São Paulo.
    expect(periodKey("daily", new Date("2026-11-19T02:30:00Z"))).toBe("2026-11-18");
  });

  it("weekly key is the ISO week", () => {
    expect(periodKey("weekly", sp("2026-11-19"))).toBe("2026-W47");
  });

  it("2026 has 53 ISO weeks: Dec 31 and Jan 1 share 2026-W53", () => {
    expect(periodKey("weekly", sp("2026-12-31"))).toBe("2026-W53");
    expect(periodKey("weekly", sp("2027-01-01"))).toBe("2026-W53");
    expect(periodKey("weekly", sp("2027-01-04"))).toBe("2027-W01");
  });

  it("ISO weeks run Monday to Sunday in São Paulo time", () => {
    expect(periodKey("weekly", sp("2026-11-22", "23:59:00"))).toBe("2026-W47");
    expect(periodKey("weekly", sp("2026-11-23", "00:00:00"))).toBe("2026-W48");
  });

  it("monthly key is the same for any day of November", () => {
    expect(periodKey("monthly", sp("2026-11-01", "00:00:00"))).toBe("2026-11");
    expect(periodKey("monthly", sp("2026-11-19"))).toBe("2026-11");
    expect(periodKey("monthly", sp("2026-11-30", "23:59:59"))).toBe("2026-11");
    expect(periodKey("monthly", sp("2026-12-01", "00:00:00"))).toBe("2026-12");
  });
});

describe("recentPeriodKeys", () => {
  it("lists the last 30 days, newest first, starting today", () => {
    const keys = recentPeriodKeys("daily", sp("2026-11-19"));
    expect(keys).toHaveLength(30);
    expect(keys[0]).toBe("2026-11-19");
    expect(keys[1]).toBe("2026-11-18");
    expect(keys[29]).toBe("2026-10-21");
  });

  it("lists the last 12 ISO weeks across the year boundary", () => {
    const keys = recentPeriodKeys("weekly", sp("2027-01-05"));
    expect(keys).toHaveLength(12);
    expect(keys.slice(0, 3)).toEqual(["2027-W01", "2026-W53", "2026-W52"]);
  });

  it("lists the last 12 months across the year boundary", () => {
    const keys = recentPeriodKeys("monthly", sp("2027-01-31"));
    expect(keys).toHaveLength(12);
    expect(keys.slice(0, 3)).toEqual(["2027-01", "2026-12", "2026-11"]);
    expect(keys[11]).toBe("2026-02");
  });
});

describe("routine completion and history (acceptance 24)", () => {
  const items = [
    { id: "a", label: "Recall", order: 1 },
    { id: "b", label: "Read", order: 2 },
    { id: "c", label: "Note", order: 3 },
  ];
  const day18 = sp("2026-11-18", "21:00:00");
  const checks = items.map((item) => ({
    routineItemId: item.id,
    periodKey: periodKey("daily", day18),
  }));

  it("a period is complete only when every active item is checked", () => {
    const key = periodKey("daily", day18);
    expect(isPeriodComplete(items, checks, key)).toBe(true);
    expect(isPeriodComplete(items, checks.slice(0, 2), key)).toBe(false);
    expect(isPeriodComplete([], [], key)).toBe(false);
  });

  it("the next day starts unchecked and history shows the previous day as 3/3", () => {
    const day19 = sp("2026-11-19", "08:00:00");
    const todayKey = periodKey("daily", day19);
    expect(todayKey).toBe("2026-11-19");
    expect(checks.filter((check) => check.periodKey === todayKey)).toHaveLength(0);
    expect(isPeriodComplete(items, checks, todayKey)).toBe(false);

    const history = buildRoutineHistory("daily", day19, items, checks);
    expect(history).toHaveLength(30);
    expect(history[0]).toMatchObject({ periodKey: "2026-11-19", done: 0, total: 3, complete: false });
    expect(history[1]).toMatchObject({ periodKey: "2026-11-18", done: 3, total: 3, complete: true });
    expect(history[1]?.checkedLabels).toEqual(["Recall", "Read", "Note"]);
  });

  it("ignores checks of items that are no longer active", () => {
    const stale = [...checks, { routineItemId: "gone", periodKey: "2026-11-18" }];
    const history = buildRoutineHistory("daily", sp("2026-11-18"), items, stale);
    expect(history[0]).toMatchObject({ done: 3, total: 3 });
  });
});

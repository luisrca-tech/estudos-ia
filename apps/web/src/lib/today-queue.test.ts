import { describe, expect, it } from "vitest";

import { buildTodayQueue, type QueueInput } from "./today-queue";

const summary = (id: string, hours: number) => ({ id, hours });

const input = (overrides: Partial<QueueInput> = {}): QueueInput => ({
  overdue: [],
  pending: [],
  reviews: { count: 0, overdueCount: 0 },
  routine: { done: 0, total: 3 },
  ...overrides,
});

describe("buildTodayQueue", () => {
  it("follows the method: debt, remembering, writing, routine", () => {
    const queue = buildTodayQueue(
      input({
        overdue: [summary("a", 43), summary("b", 26)],
        pending: [summary("c", 21)],
        reviews: { count: 8, overdueCount: 2 },
        routine: { done: 1, total: 3 },
      }),
    );
    expect(queue.steps.map((step) => step.kind)).toEqual(["overdue-summaries", "reviews", "pending-summaries", "routine"]);
    expect(queue.steps.map((step) => step.number)).toEqual([1, 2, 3, 4]);
    expect(queue.steps.map((step) => step.state)).toEqual(["next", "pending", "pending", "pending"]);
    expect(queue.steps[0]?.overdue).toBe(true);
    expect(queue.steps.slice(1).every((step) => !step.overdue)).toBe(true);
    expect(queue.allDone).toBe(false);
    expect(queue.openCount).toBe(4);
  });

  it("leaves out steps with nothing to do and opens the first remaining one", () => {
    const queue = buildTodayQueue(input({ reviews: { count: 3, overdueCount: 0 } }));
    expect(queue.steps.map((step) => [step.kind, step.state])).toEqual([
      ["reviews", "next"],
      ["routine", "pending"],
    ]);
  });

  it("a done routine collapses and moves to the end", () => {
    const queue = buildTodayQueue(
      input({ pending: [summary("c", 5)], routine: { done: 3, total: 3 } }),
    );
    expect(queue.steps.map((step) => [step.kind, step.state, step.number])).toEqual([
      ["pending-summaries", "next", 1],
      ["routine", "done", 2],
    ]);
    expect(queue.openCount).toBe(1);
  });

  it("is all done when only a finished routine is left", () => {
    const queue = buildTodayQueue(input({ routine: { done: 3, total: 3 } }));
    expect(queue.allDone).toBe(true);
    expect(queue.openCount).toBe(0);
  });

  it("an empty routine (no items) does not block 'all done'", () => {
    expect(buildTodayQueue(input({ routine: { done: 0, total: 0 } })).allDone).toBe(true);
  });

  it("an open routine alone is the next step", () => {
    const queue = buildTodayQueue(input({ routine: { done: 2, total: 3 } }));
    expect(queue.steps).toHaveLength(1);
    expect(queue.steps[0]).toMatchObject({ kind: "routine", state: "next" });
    expect(queue.allDone).toBe(false);
  });
});

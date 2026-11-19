/**
 * The Today screen is a numbered queue in the order of the method:
 * debt (overdue summaries), remembering (reviews), writing (pending summary),
 * then the daily routine. Only the first open step is expanded; a finished
 * step collapses and moves to the end.
 */

export type QueueStepKind = "overdue-summaries" | "reviews" | "pending-summaries" | "routine";
export type QueueStepState = "next" | "pending" | "done";

export type QueueInput = {
  overdue: ReadonlyArray<{ id: string }>;
  pending: ReadonlyArray<{ id: string }>;
  reviews: { count: number; overdueCount: number };
  routine: { done: number; total: number };
};

export type QueueStep = {
  kind: QueueStepKind;
  number: number;
  state: QueueStepState;
  /** Overdue debt: danger marker and badge. */
  overdue: boolean;
};

export type TodayQueue = {
  steps: QueueStep[];
  /** Steps still to do. */
  openCount: number;
  allDone: boolean;
};

export function buildTodayQueue(input: QueueInput): TodayQueue {
  const candidates: Array<{ kind: QueueStepKind; done: boolean; overdue: boolean }> = [];
  if (input.overdue.length > 0) candidates.push({ kind: "overdue-summaries", done: false, overdue: true });
  if (input.reviews.count > 0) candidates.push({ kind: "reviews", done: false, overdue: false });
  if (input.pending.length > 0) candidates.push({ kind: "pending-summaries", done: false, overdue: false });
  if (input.routine.total > 0) {
    candidates.push({ kind: "routine", done: input.routine.done >= input.routine.total, overdue: false });
  }

  const ordered = [...candidates.filter((step) => !step.done), ...candidates.filter((step) => step.done)];
  let nextAssigned = false;
  const steps = ordered.map((step, index): QueueStep => {
    let state: QueueStepState = "done";
    if (!step.done) {
      state = nextAssigned ? "pending" : "next";
      nextAssigned = true;
    }
    return { kind: step.kind, number: index + 1, state, overdue: step.overdue };
  });

  const openCount = steps.filter((step) => step.state !== "done").length;
  return { steps, openCount, allDone: openCount === 0 };
}

import { addDays, today, type CalendarDay } from "./time";

/**
 * Cumulative intervals of 1, 3, 7 and 21 days, stored as gaps from the last
 * review actually done. A late review pushes the following ones.
 */
export const GAPS = [1, 2, 4, 14] as const;

/** Step reached after the four reviews; a graduated note leaves the queue. */
export const GRADUATED_STEP = GAPS.length;

/** At most this many first reviews per day for notes of one import batch. */
export const IMPORT_REVIEWS_PER_DAY = 3;

export type ReviewResult = "recalled" | "forgot";

export type ReviewState = {
  step: number;
  dueOn: CalendarDay | null;
  graduatedAt: Date | null;
};

export function initialSchedule(createdAt: Date): ReviewState {
  return { step: 0, dueOn: addDays(today(createdAt), GAPS[0]), graduatedAt: null };
}

export function isDue(state: Pick<ReviewState, "dueOn" | "graduatedAt">, now: Date): boolean {
  return state.graduatedAt === null && state.dueOn !== null && state.dueOn <= today(now);
}

export function applyReview(state: ReviewState, result: ReviewResult, now: Date): ReviewState {
  if (state.graduatedAt !== null || state.step >= GRADUATED_STEP) {
    throw new Error("Cannot review a graduated note");
  }
  const day = today(now);
  if (result === "forgot") {
    return { step: 0, dueOn: addDays(day, GAPS[0]), graduatedAt: null };
  }
  const nextStep = state.step + 1;
  const gap = GAPS[nextStep];
  if (gap === undefined) {
    return { step: GRADUATED_STEP, dueOn: null, graduatedAt: now };
  }
  return { step: nextStep, dueOn: addDays(day, gap), graduatedAt: null };
}

export type DueReview = {
  noteId: string;
  moduleId: string;
  /** Sort position of the module in the track. */
  moduleOrder: number;
  dueOn: CalendarDay;
  createdAt: Date;
};

function interleaveByModule<T extends DueReview>(items: T[]): T[] {
  const byModule = new Map<string, T[]>();
  for (const item of items) {
    const list = byModule.get(item.moduleId);
    if (list) list.push(item);
    else byModule.set(item.moduleId, [item]);
  }
  const queues = [...byModule.values()]
    .map((list) =>
      list.sort(
        (a, b) => a.dueOn.localeCompare(b.dueOn) || a.createdAt.getTime() - b.createdAt.getTime(),
      ),
    )
    .sort((a, b) => a[0]!.moduleOrder - b[0]!.moduleOrder);

  const ordered: T[] = [];
  for (let round = 0; ordered.length < items.length; round += 1) {
    for (const queue of queues) {
      const item = queue[round];
      if (item) ordered.push(item);
    }
  }
  return ordered;
}

/**
 * Queue of the day: overdue first, then due today. Inside each group, modules
 * are interleaved round-robin (the method asks for interleaving).
 */
export function orderDueReviews<T extends DueReview>(items: T[], now: Date): Array<T & { overdue: boolean }> {
  const day = today(now);
  const overdue = items.filter((item) => item.dueOn < day);
  const dueToday = items.filter((item) => item.dueOn === day);
  return [
    ...interleaveByModule(overdue).map((item) => ({ ...item, overdue: true })),
    ...interleaveByModule(dueToday).map((item) => ({ ...item, overdue: false })),
  ];
}

export type NoteType = "summary" | "question" | "decision" | "evidence";

/** What is shown before the note body is revealed. */
export function recallPromptFor(
  note: { type: NoteType; title: string; recallPrompt: string | null },
  moduleKicker: string,
): string {
  const own = note.recallPrompt?.trim();
  if (own) return own;
  switch (note.type) {
    case "summary":
      return `Explique com suas palavras: "${note.title}" (${moduleKicker}).`;
    case "question":
      return note.title;
    case "decision":
      return `Que decisão você tomou sobre "${note.title}", e o que te faria mudar de ideia?`;
    case "evidence":
      return `Qual é a evidência de "${note.title}", e com que grau (A–E)?`;
  }
}

/**
 * First review dates for a batch of imported notes: 3 on today + 1, the next
 * 3 on today + 2, and so on. Later reviews follow the regular schedule.
 */
export function staggeredDueDates(count: number, now: Date): CalendarDay[] {
  const day = today(now);
  return Array.from({ length: count }, (_, index) =>
    addDays(day, 1 + Math.floor(index / IMPORT_REVIEWS_PER_DAY)),
  );
}

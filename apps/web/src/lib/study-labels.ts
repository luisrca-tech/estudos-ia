import { GAPS } from "@estudos-ia/api/rules/review";
import { today } from "@estudos-ia/api/rules/time";

const dayDiff = (from: string, to: string) =>
  Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000);

/** What "Lembrei" means for a note at `step`; gaps come from the tested review rule. */
export function nextReviewLabel(step: number): string {
  const gap = GAPS[step + 1];
  if (gap === undefined) return "última revisão";
  return `próxima em ${gap} ${gap === 1 ? "dia" : "dias"}`;
}

export function overdueLabel(dueOn: string, now: Date): string | null {
  const late = dayDiff(dueOn, today(now));
  if (late <= 0) return null;
  return `atrasada ${late} ${late === 1 ? "dia" : "dias"}`;
}

export function suggestionReason(
  module: { masteryLevel: number; lastSessionAt: Date | string | null },
  now: Date,
): string {
  const step = `Sugerido: degrau ${module.masteryLevel}`;
  if (!module.lastSessionAt) return `${step}, nenhuma sessão ainda.`;
  const days = dayDiff(today(new Date(module.lastSessionAt)), today(now));
  const when = days <= 0 ? "hoje" : days === 1 ? "ontem" : `há ${days} dias`;
  return `${step}, última sessão ${when}.`;
}

export type TimerPhase = "running" | "last-minute" | "finished";

export function timerPhase(remainingSeconds: number): TimerPhase {
  if (remainingSeconds <= 0) return "finished";
  return remainingSeconds <= 60 ? "last-minute" : "running";
}

/** Ruler on the dock's top edge: one tick per minute, a taller one every 5. */
export function rulerTicks(totalMinutes: number): Array<{ leftPct: number; major: boolean }> {
  const ticks: Array<{ leftPct: number; major: boolean }> = [];
  for (let minute = 1; minute < totalMinutes; minute += 1) {
    ticks.push({ leftPct: Math.round((minute / totalMinutes) * 10_000) / 100, major: minute % 5 === 0 });
  }
  return ticks;
}

export type DegreeCell = "accent" | "success" | "empty";

/** Five cells of the module map: accent up to step 2, green from step 3 (the goal). */
export function degreeCells(level: number): DegreeCell[] {
  const filled: DegreeCell = level >= 3 ? "success" : "accent";
  return [1, 2, 3, 4, 5].map((step) => (step <= level ? filled : "empty"));
}

export function goalProgress(levels: number[]) {
  return {
    total: levels.length,
    atGoal: levels.filter((level) => level >= 3).length,
    atFour: levels.filter((level) => level >= 4).length,
    started: levels.filter((level) => level > 0).length,
  };
}

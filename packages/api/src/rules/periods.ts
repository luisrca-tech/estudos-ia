import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

import { addDays, inAppTz, today } from "./time";

export type Cadence = "daily" | "weekly" | "monthly";

export const CADENCES: readonly Cadence[] = ["daily", "weekly", "monthly"];

/** How many periods the history shows per cadence: 30 days, 12 weeks, 12 months. */
export const HISTORY_LENGTH: Record<Cadence, number> = { daily: 30, weekly: 12, monthly: 12 };

const PERIOD_FORMAT: Record<Cadence, string> = {
  daily: "yyyy-MM-dd",
  weekly: "RRRR-'W'II", // ISO week, Monday to Sunday
  monthly: "yyyy-MM",
};

export function periodKey(cadence: Cadence, now: Date): string {
  return format(inAppTz(now), PERIOD_FORMAT[cadence]);
}

/** Period keys ending at the current period, newest first. */
export function recentPeriodKeys(
  cadence: Cadence,
  now: Date,
  count: number = HISTORY_LENGTH[cadence],
): string[] {
  const day = today(now);
  if (cadence === "monthly") {
    const year = Number(day.slice(0, 4));
    const month = Number(day.slice(5, 7));
    return Array.from({ length: count }, (_, index) => {
      const monthsSinceYearZero = year * 12 + (month - 1) - index;
      const y = Math.floor(monthsSinceYearZero / 12);
      const m = (monthsSinceYearZero % 12) + 1;
      return `${y}-${String(m).padStart(2, "0")}`;
    });
  }
  const step = cadence === "weekly" ? 7 : 1;
  return Array.from({ length: count }, (_, index) => {
    const past = addDays(day, -step * index);
    // Noon UTC of a calendar day formats to that same day and its ISO week.
    return format(new TZDate(`${past}T12:00:00Z`, "UTC"), PERIOD_FORMAT[cadence]);
  });
}

export type RoutineItemRef = { id: string; label: string; order: number };
export type RoutineCheckRef = { routineItemId: string; periodKey: string };

function checkedItems(items: RoutineItemRef[], checks: RoutineCheckRef[], key: string): RoutineItemRef[] {
  const checked = new Set(
    checks.filter((check) => check.periodKey === key).map((check) => check.routineItemId),
  );
  return items.filter((item) => checked.has(item.id)).sort((a, b) => a.order - b.order);
}

/** `items` are the non-archived items of one cadence. */
export function isPeriodComplete(items: RoutineItemRef[], checks: RoutineCheckRef[], key: string): boolean {
  return items.length > 0 && checkedItems(items, checks, key).length === items.length;
}

export type RoutineHistoryEntry = {
  periodKey: string;
  done: number;
  total: number;
  complete: boolean;
  checkedLabels: string[];
};

export function buildRoutineHistory(
  cadence: Cadence,
  now: Date,
  items: RoutineItemRef[],
  checks: RoutineCheckRef[],
): RoutineHistoryEntry[] {
  return recentPeriodKeys(cadence, now).map((key) => {
    const checked = checkedItems(items, checks, key);
    return {
      periodKey: key,
      done: checked.length,
      total: items.length,
      complete: items.length > 0 && checked.length === items.length,
      checkedLabels: checked.map((item) => item.label),
    };
  });
}

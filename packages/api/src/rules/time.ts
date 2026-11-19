import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

export const APP_TZ = "America/Sao_Paulo";

/** A calendar date in APP_TZ, formatted as YYYY-MM-DD. */
export type CalendarDay = string;

export function inAppTz(now: Date): TZDate {
  return new TZDate(now.getTime(), APP_TZ);
}

/** Calendar date of `now` in APP_TZ. */
export function today(now: Date): CalendarDay {
  return format(inAppTz(now), "yyyy-MM-dd");
}

/** Calendar arithmetic on a YYYY-MM-DD date; independent of DST and time of day. */
export function addDays(day: CalendarDay, amount: number): CalendarDay {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

/** dd/MM/yyyy of `now` in APP_TZ. */
export function formatDayMonthYear(now: Date): string {
  return format(inAppTz(now), "dd/MM/yyyy");
}

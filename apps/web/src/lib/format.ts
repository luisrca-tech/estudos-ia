const TZ = "America/Sao_Paulo";
const LOCALE = "pt-BR";

type DateInput = string | Date;

const longDate = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "2-digit", timeZone: TZ });
const dayMonthYear = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ });
const time = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const weekdayShort = new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" });

/** A YYYY-MM-DD calendar day as a date that formats to that same day in UTC. */
function calendarDay(day: string): Date {
  return new Date(`${day}T12:00:00Z`);
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Quinta-feira, 19 de novembro" from a YYYY-MM-DD day. */
export function formatLongDay(day: string): string {
  return capitalize(longDate.format(calendarDay(day)));
}

/** "19/11" */
export function formatDayMonth(value: DateInput): string {
  return dayMonth.format(new Date(value));
}

/** "19/11/2026" */
export function formatDate(value: DateInput): string {
  return dayMonthYear.format(new Date(value));
}

/** "19/11 às 16:30" */
export function formatDateTime(value: DateInput): string {
  const date = new Date(value);
  return `${dayMonth.format(date)} às ${time.format(date)}`;
}

/** "25 min", "1 h 05 min", "menos de 1 min" */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return "menos de 1 min";
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 60)} h ${String(rest).padStart(2, "0")} min`;
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export type Cadence = "daily" | "weekly" | "monthly";

/** Label of a routine period key: "19/11 (qui.)", "Semana 2026-W47", "Novembro de 2026". */
export function formatPeriod(cadence: Cadence, key: string): string {
  if (cadence === "daily") {
    const day = calendarDay(key);
    return `${key.slice(8, 10)}/${key.slice(5, 7)} (${weekdayShort.format(day)})`;
  }
  if (cadence === "weekly") return `Semana ${key}`;
  return capitalize(monthYear.format(calendarDay(`${key}-15`)));
}

/** "Módulo 5 · Ferramentas e a interface agente-computador"; non-numbered sections keep their kicker. */
export function moduleLabel(kicker: string, title: string): string {
  const number = kicker.split(" · ")[0] ?? kicker;
  return `${number} · ${title}`;
}

/** "Módulo 5" or the kicker of a section without a number. */
export function moduleNumber(kicker: string): string {
  return kicker.split(" · ")[0] ?? kicker;
}

/** "09:40" in São Paulo time. */
export function formatTime(value: DateInput): string {
  return time.format(new Date(value));
}

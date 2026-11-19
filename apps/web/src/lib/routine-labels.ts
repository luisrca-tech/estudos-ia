import { addDays, today } from "@estudos-ia/api/rules/time";

type Cadence = "daily" | "weekly" | "monthly";

const WEEKDAYS_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const utc = (day: string) => new Date(`${day}T12:00:00Z`);
const dm = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
const dShort = (day: string) => String(Number(day.slice(8, 10)));
const mShort = (day: string) => String(Number(day.slice(5, 7)));

/** "Responder … (5 min)" → text and the duration hint. */
export function splitRoutineLabel(label: string): { text: string; duration: string | null } {
  const match = label.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  return match ? { text: match[1]!, duration: match[2]! } : { text: label, duration: null };
}

/** Monday of the ISO week that contains `day`. */
function mondayOf(day: string): string {
  const weekday = utc(day).getUTCDay();
  return addDays(day, weekday === 0 ? -6 : 1 - weekday);
}

function weekRange(monday: string): string {
  const sunday = addDays(monday, 6);
  if (monday.slice(5, 7) === sunday.slice(5, 7)) return `${dShort(monday)} a ${dShort(sunday)}/${mShort(sunday)}`;
  return `${dShort(monday)}/${mShort(monday)} a ${dShort(sunday)}/${mShort(sunday)}`;
}

function daysLeftInMonth(day: string): number {
  const date = utc(day);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  return last - date.getUTCDate();
}

export function periodRemaining(cadence: "weekly" | "monthly", now: Date): string {
  const day = today(now);
  if (cadence === "weekly") return utc(day).getUTCDay() === 0 ? "até hoje" : "até domingo";
  const left = daysLeftInMonth(day);
  return left === 0 ? "último dia" : left === 1 ? "falta 1 dia" : `faltam ${left} dias`;
}

export function periodHeading(cadence: Cadence, now: Date): string {
  const day = today(now);
  if (cadence === "daily") return `${WEEKDAYS_LONG[utc(day).getUTCDay()]}, ${dm(day)}`;
  if (cadence === "weekly") {
    const ends = utc(day).getUTCDay() === 0 ? "termina hoje" : "termina domingo";
    return `${weekRange(mondayOf(day))} · ${ends}`;
  }
  const month = MONTHS[utc(day).getUTCMonth()]!;
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} · ${periodRemaining("monthly", now)}`;
}

/** Label of a past period key in the routine history. */
export function historyLabel(cadence: Cadence, key: string): string {
  if (cadence === "daily") return `${WEEKDAYS_SHORT[utc(key).getUTCDay()]}, ${dm(key)}`;
  if (cadence === "monthly") return MONTHS[Number(key.slice(5, 7)) - 1]!;
  const [year, week] = key.split("-W").map(Number);
  // January 4th is always in ISO week 1.
  const weekOne = mondayOf(`${year}-01-04`);
  return weekRange(addDays(weekOne, (week! - 1) * 7));
}

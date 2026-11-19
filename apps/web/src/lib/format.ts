const TZ = "America/Sao_Paulo";
const LOCALE = "pt-BR";

type DateInput = string | Date;

const longDate = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "2-digit", timeZone: TZ });
const dayMonthYear = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ });
const time = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", timeZone: TZ });

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

const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "Quinta, 19 de novembro" from a YYYY-MM-DD day. */
export function formatDayTitle(day: string): string {
  const date = calendarDay(day);
  return `${capitalize(WEEKDAY_NAMES[date.getUTCDay()]!)}, ${date.getUTCDate()} de ${MONTH_NAMES[date.getUTCMonth()]}`;
}

const spParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "Sessão de terça, 17/11, 14:10" in São Paulo time. */
export function formatSessionWhen(value: DateInput): string {
  const parts = Object.fromEntries(spParts.formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  const weekday = WEEKDAY_NAMES[calendarDay(`${parts.year}-${parts.month}-${parts.day}`).getUTCDay()];
  return `Sessão de ${weekday}, ${parts.day}/${parts.month}, ${parts.hour}:${parts.minute}`;
}

function spDayKey(value: DateInput): string {
  const parts = Object.fromEntries(spParts.formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Last session column of the module map: "hoje, 09:40", "ter, 17/11" within 6 days, else "12/11". */
export function formatLastSession(value: DateInput | null, now: Date): string {
  if (!value) return "–";
  const day = spDayKey(value);
  const todayKey = spDayKey(now);
  if (day === todayKey) return `hoje, ${formatTime(value)}`;
  const days = Math.round((calendarDay(todayKey).getTime() - calendarDay(day).getTime()) / 86_400_000);
  const dayMonth = `${day.slice(8, 10)}/${day.slice(5, 7)}`;
  if (days > 0 && days <= 6) return `${WEEKDAY_NAMES[calendarDay(day).getUTCDay()]!.slice(0, 3)}, ${dayMonth}`;
  return dayMonth;
}

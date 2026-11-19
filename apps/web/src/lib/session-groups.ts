import { periodKey } from "@estudos-ia/api/rules/periods";
import { today } from "@estudos-ia/api/rules/time";

type SessionLike = {
  startedAt: Date | string;
  status: "running" | "completed" | "cancelled";
  durationSeconds: number | null;
};

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function dayLabel(day: string, todayKey: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  const weekday = WEEKDAYS[date.getUTCDay()]!;
  const dayMonth = `${day.slice(8, 10)}/${day.slice(5, 7)}`;
  if (day === todayKey) return `Hoje, ${weekday} ${dayMonth}`;
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dayMonth}`;
}

/** Groups sessions by their São Paulo calendar day, keeping the input order. */
export function groupSessionsByDay<T extends { startedAt: Date | string }>(sessions: T[], now: Date) {
  const todayKey = today(now);
  const groups: Array<{ day: string; label: string; sessions: T[] }> = [];
  for (const session of sessions) {
    const day = today(new Date(session.startedAt));
    const last = groups.at(-1);
    if (last && last.day === day) last.sessions.push(session);
    else groups.push({ day, label: dayLabel(day, todayKey), sessions: [session] });
  }
  return groups;
}

/** Completed sessions and focus time in the current ISO week. */
export function weekSummary(sessions: SessionLike[], now: Date) {
  const week = periodKey("weekly", now);
  const inWeek = sessions.filter(
    (session) => session.status === "completed" && periodKey("weekly", new Date(session.startedAt)) === week,
  );
  return {
    completed: inWeek.length,
    focusSeconds: inWeek.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0),
  };
}

export function needsSummary(session: { summary: { state: string } }): boolean {
  return session.summary.state === "pending" || session.summary.state === "overdue";
}

/** "25 / 25 min" and the bar ratio; running sessions count up to now. */
export function focusLabel(
  session: SessionLike & { plannedMinutes: number },
  now: Date,
): { text: string; ratio: number } {
  const seconds =
    session.status === "running"
      ? Math.max(0, (now.getTime() - new Date(session.startedAt).getTime()) / 1000)
      : session.durationSeconds;
  if (seconds === null) return { text: `– / ${session.plannedMinutes} min`, ratio: 0 };
  const minutes = Math.floor(seconds / 60);
  const ratio = Math.min(1, Math.round((seconds / (session.plannedMinutes * 60)) * 100) / 100);
  return { text: `${String(minutes).padStart(2, "0")} / ${session.plannedMinutes} min`, ratio };
}

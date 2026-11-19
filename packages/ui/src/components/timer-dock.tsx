import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

export type TimerDockPhase = "running" | "last-minute" | "finished";

type TimerDockProps = {
  phase: TimerDockPhase;
  /** "18:42" */
  remaining: string;
  /** "25:00" */
  total: string;
  /** 0 to 1 */
  progress: number;
  ticks: ReadonlyArray<{ leftPct: number; major: boolean }>;
  status: React.ReactNode;
  module: React.ReactNode;
  actions: React.ReactNode;
  notice?: React.ReactNode;
  className?: string;
};

export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`;
}

/**
 * Session dock (board "Timer"): sticky at the bottom of every page. Its top
 * edge is the ruler, one tick per minute and a taller one every 5.
 */
function TimerDock({ phase, remaining, total, progress, ticks, status, module, actions, notice, className }: TimerDockProps) {
  const warning = phase === "last-minute";
  return (
    <section
      role="timer"
      aria-label="Sessão em andamento"
      data-phase={phase}
      className={cn("w-full border-t border-line bg-surface text-foreground shadow-dock", className)}
    >
      <div
        aria-hidden
        className="relative h-1.5 bg-surface-sunken"
      >
        <div
          className={cn("absolute inset-y-0 left-0 transition-[width] duration-1000 ease-linear", warning ? "bg-warning" : "bg-accent")}
          style={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%` }}
        />
        {ticks.map((tick) => (
          <div
            key={tick.leftPct}
            className={cn("absolute top-0 w-px bg-surface opacity-90", tick.major ? "h-1.5" : "h-[3px]")}
            style={{ left: `${tick.leftPct}%` }}
          />
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-page flex-wrap items-center gap-x-6 gap-y-2.5 px-4 pt-2.5 pb-3 sm:px-8">
        <div className="flex flex-none items-baseline gap-2">
          <span
            className={cn(
              "font-mono text-2xl leading-none font-medium tabular-nums",
              warning ? "text-warning" : phase === "finished" ? "text-accent" : "text-foreground",
            )}
          >
            {remaining}
          </span>
          <span className="font-mono text-[13px] text-muted-foreground">/ {total}</span>
        </div>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col">
          <span className={cn("text-[13px] font-medium", warning ? "text-warning" : phase === "finished" ? "text-foreground" : "text-muted-foreground")}>
            {status}
          </span>
          <span className="truncate text-sm">{module}</span>
        </div>
        <div className="flex flex-none flex-wrap items-center gap-2">{actions}</div>
        {notice ? <p className="w-full text-[13px] text-warning">{notice}</p> : null}
      </div>
    </section>
  );
}

export { TimerDock };

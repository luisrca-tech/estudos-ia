import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

type TimerBarProps = {
  /** Seconds left; values below zero are shown as 00:00. */
  remainingSeconds: number;
  totalSeconds: number;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
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
 * The session countdown drawn as a ruler: one mark per minute (per 5 minutes
 * on long sessions) that fills up as time passes.
 */
function TimerBar({ remainingSeconds, totalSeconds, title, subtitle, actions, className }: TimerBarProps) {
  const remaining = Math.max(0, remainingSeconds);
  const elapsedRatio = totalSeconds > 0 ? Math.min(1, Math.max(0, 1 - remaining / totalSeconds)) : 1;
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  const marks = totalMinutes > 60 ? Math.round(totalMinutes / 5) : totalMinutes;
  const ending = remaining <= 60;

  return (
    <div
      data-slot="timer-bar"
      data-state={remaining === 0 ? "finished" : ending ? "ending" : "running"}
      className={cn("rounded-lg border border-line bg-surface px-4 py-3 shadow-sm", className)}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div
          role="timer"
          aria-label="Tempo restante da sessão"
          className={cn(
            "font-mono text-3xl font-medium tabular-nums",
            ending ? "text-warning" : "text-foreground",
          )}
        >
          {formatClock(remaining)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{title}</p>
          {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      <div
        role="progressbar"
        aria-label="Progresso da sessão"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(elapsedRatio * 100)}
        className="relative mt-3 h-4 overflow-hidden rounded-sm bg-surface-sunken"
      >
        <div
          className={cn("absolute inset-y-0 left-0 transition-[width] duration-1000 ease-linear", ending ? "bg-warning/35" : "bg-accent/30")}
          style={{ width: `${elapsedRatio * 100}%` }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(to right, var(--line-strong) 1px, transparent 1px)",
            backgroundSize: `${100 / marks}% 100%`,
          }}
        />
        <div
          aria-hidden
          className={cn("absolute inset-y-0 w-0.5 transition-[left] duration-1000 ease-linear", ending ? "bg-warning" : "bg-accent")}
          style={{ left: `calc(${elapsedRatio * 100}% - 1px)` }}
        />
      </div>
    </div>
  );
}

export { TimerBar };

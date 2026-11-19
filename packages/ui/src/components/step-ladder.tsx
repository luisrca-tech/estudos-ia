"use client";

import { cn } from "@estudos-ia/ui/lib/utils";

const STEPS = [1, 2, 3, 4, 5] as const;
const BAR_HEIGHT = ["h-1.5", "h-2.5", "h-3.5", "h-[1.125rem]", "h-[1.375rem]"] as const;

/** Mastery (0–5) drawn as five rising bars: the ladder of the method. */
function StepLadder({ level, label, className }: { level: number; label?: string; className?: string }) {
  return (
    <span
      role="img"
      aria-label={label ?? `Degrau ${level} de 5`}
      data-slot="step-ladder"
      className={cn("inline-flex items-end gap-0.5", className)}
    >
      {STEPS.map((step, index) => (
        <span
          key={step}
          className={cn("w-1.5 rounded-[1px]", BAR_HEIGHT[index], step <= level ? "bg-accent" : "bg-line-strong/60")}
        />
      ))}
    </span>
  );
}

type StepSelectorProps = {
  level: number;
  onLevelChange: (level: number) => void;
  /** Labels for steps 1 to 5. */
  labels: readonly [string, string, string, string, string];
  descriptions?: readonly [string, string, string, string, string];
  disabled?: boolean;
  className?: string;
};

/** Pick the mastery step. Choosing the current step again goes one step back. */
function StepSelector({ level, onLevelChange, labels, descriptions, disabled, className }: StepSelectorProps) {
  return (
    <div role="group" aria-label="Degrau de domínio" data-slot="step-selector" className={cn("grid grid-cols-5 items-end gap-1.5", className)}>
      {STEPS.map((step, index) => {
        const reached = step <= level;
        return (
          <button
            key={step}
            type="button"
            disabled={disabled}
            aria-pressed={reached}
            title={descriptions?.[index]}
            onClick={() => onLevelChange(step === level ? step - 1 : step)}
            className="group flex cursor-pointer flex-col gap-1.5 rounded-sm text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              className={cn(
                "block w-full rounded-sm border transition-colors",
                reached ? "border-accent bg-accent" : "border-line-strong bg-surface group-hover:border-accent",
              )}
              style={{ height: `${0.5 + index * 0.4}rem` }}
            />
            <span className={cn("text-xs leading-tight sm:text-sm", reached ? "font-medium text-foreground" : "text-muted-foreground")}>
              <span className="tabular-nums">{step}</span> {labels[index]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { StepLadder, StepSelector };

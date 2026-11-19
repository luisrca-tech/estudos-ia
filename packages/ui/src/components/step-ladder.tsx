"use client";

import { cn } from "@estudos-ia/ui/lib/utils";

type StaircaseProps = {
  level: number;
  /** Labels for steps 1 to 5. */
  labels: readonly [string, string, string, string, string];
  onLevelChange: (level: number) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * The mastery ladder drawn as stairs (board "Escada"): done steps in
 * accent-soft, the current one filled, the next one dashed. Choosing the
 * current step again goes one step down.
 */
function Staircase({ level, labels, onLevelChange, disabled, className }: StaircaseProps) {
  return (
    <div role="group" aria-label="Degrau de domínio" className={cn("flex flex-col gap-1", className)}>
      {[5, 4, 3, 2, 1].map((step) => {
        const current = step === level;
        const next = step === level + 1;
        const done = step < level;
        return (
          <button
            key={step}
            type="button"
            aria-pressed={current}
            disabled={disabled}
            onClick={() => onLevelChange(current ? step - 1 : step)}
            style={{ marginLeft: `${(step - 1) * 12}px` }}
            className={cn(
              "flex min-h-9 cursor-pointer items-center gap-2.5 rounded-sm border px-2.5 text-left text-sm transition-colors duration-150 disabled:cursor-progress",
              current && "border-accent bg-accent font-medium text-accent-foreground",
              next && "border-dashed border-accent font-medium text-foreground hover:bg-accent-soft",
              done && "border-line bg-accent-soft text-foreground",
              !current && !next && !done && "border-line text-muted-foreground hover:border-accent",
            )}
          >
            <span className="font-mono text-xs">{step}</span>
            {labels[step - 1]}
            <span className={cn("ml-auto text-xs", current ? "text-accent-foreground/85" : "text-muted-foreground")}>
              {current ? "você está aqui" : next ? "próximo" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { Staircase };

"use client";

import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

type ChecklistItemProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: React.ReactNode;
  /** Duration hint under the label. */
  hint?: React.ReactNode;
  disabled?: boolean;
  /** Draws a divider above the row (routine columns). */
  divided?: boolean;
  className?: string;
};

/** One routine line (board "Checklist e histórico"). The whole row is the click target. */
function ChecklistItem({ checked, onCheckedChange, children, hint, disabled, divided, className }: ChecklistItemProps) {
  return (
    <label
      data-slot="checklist-item"
      data-checked={checked || undefined}
      className={cn(
        "flex min-h-8 cursor-pointer items-start gap-3 has-disabled:cursor-progress",
        divided && "border-t border-line py-2.5",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="mt-0.5 size-[18px] flex-none cursor-pointer accent-accent disabled:cursor-progress"
      />
      <span className="flex min-w-0 flex-col">
        <span className={cn(checked ? "text-muted-foreground line-through" : "text-foreground")}>{children}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </span>
    </label>
  );
}

export { ChecklistItem };

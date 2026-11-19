"use client";

import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

import { Checkbox } from "./checkbox";

type ChecklistItemProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
  className?: string;
};

/** One routine line. The whole row is the click target. */
function ChecklistItem({ checked, onCheckedChange, children, hint, disabled, className }: ChecklistItemProps) {
  return (
    <label
      data-slot="checklist-item"
      data-checked={checked || undefined}
      className={cn(
        "group flex cursor-pointer items-start gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-surface-sunken has-disabled:cursor-not-allowed has-disabled:opacity-60",
        className,
      )}
    >
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} disabled={disabled} className="mt-0.5" />
      <span className="min-w-0">
        <span className={cn("block", checked && "text-muted-foreground line-through decoration-1")}>{children}</span>
        {hint ? <span className="mt-0.5 block text-sm text-muted-foreground">{hint}</span> : null}
      </span>
    </label>
  );
}

export { ChecklistItem };

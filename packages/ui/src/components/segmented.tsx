"use client";

import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

type SegmentedOption<T extends string> = { value: T; label: React.ReactNode };

type SegmentedProps<T extends string> = {
  /** Accessible name of the group. */
  label: string;
  name: string;
  value: T;
  onValueChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  className?: string;
};

/** Single choice among a few options, built on native radios. */
function Segmented<T extends string>({ label, name, value, onValueChange, options, className }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-slot="segmented"
      className={cn("inline-flex flex-wrap gap-1 rounded-md border border-line bg-surface-sunken p-1", className)}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className="cursor-pointer rounded-sm px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground has-checked:bg-surface has-checked:text-foreground has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onValueChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

export { Segmented };

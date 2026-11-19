import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

import { Label } from "./label";

type FieldProps = {
  label: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Marks the label as optional instead of marking the others as required. */
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Label, control, hint and error. The control receives `id` and `aria-describedby` from the caller. */
function Field({ label, htmlFor, hint, error, optional, className, children }: FieldProps) {
  return (
    <div data-slot="field" className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional ? <span className="font-normal text-muted-foreground"> (opcional)</span> : null}
      </Label>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { Field };

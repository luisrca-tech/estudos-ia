import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

export const controlClassName =
  "w-full min-w-0 rounded-sm border border-line-strong bg-surface px-3 text-base text-foreground transition-colors placeholder:text-muted-foreground/80 hover:border-foreground/40 focus-visible:border-accent disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60 aria-invalid:border-danger";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" className={cn(controlClassName, "h-10", className)} {...props} />;
}

export { Input };

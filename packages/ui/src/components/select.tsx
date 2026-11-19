import { cn } from "@estudos-ia/ui/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import * as React from "react";

import { controlClassName } from "./input";

/** Native select: keyboard and screen reader behaviour for free. */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <span className={cn("relative block", className)}>
      <select data-slot="select" className={cn(controlClassName, "h-10 cursor-pointer appearance-none pr-9")} {...props}>
        {children}
      </select>
      <ChevronDownIcon aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  );
}

export { Select };

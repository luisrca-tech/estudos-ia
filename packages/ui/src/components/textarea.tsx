import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

import { controlClassName } from "./input";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(controlClassName, "field-sizing-content min-h-24 resize-y py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

export { Textarea };

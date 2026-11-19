import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

/** Typography for rendered Markdown. `inline` keeps one-line content flowing with its parent. */
function Prose({ inline, className, ...props }: React.ComponentProps<"div"> & { inline?: boolean }) {
  const Element = inline ? "span" : "div";
  return <Element data-slot="prose" className={cn("prose-estudo", inline && "prose-inline", className)} {...props} />;
}

export { Prose };

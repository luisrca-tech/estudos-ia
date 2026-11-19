import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden className={cn("animate-pulse rounded-sm bg-surface-sunken", className)} {...props} />;
}

const LINE_WIDTHS = ["w-11/12", "w-full", "w-4/5", "w-10/12", "w-3/5"] as const;

/** Text-shaped placeholder: keeps the layout steady while content loads. */
function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div role="status" aria-label="Carregando" className={cn("flex flex-col gap-2.5", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn("h-4", LINE_WIDTHS[index % LINE_WIDTHS.length])} />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonLines };

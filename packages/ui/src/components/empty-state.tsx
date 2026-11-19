import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

type EmptyStateProps = {
  title: React.ReactNode;
  /** One sentence that says what to do next. */
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

function EmptyState({ title, children, action, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn("flex flex-col items-start gap-2 rounded-md border border-dashed border-line-strong px-5 py-5", className)}
    >
      <p className="font-medium">{title}</p>
      {children ? <p className="text-sm text-muted-foreground">{children}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export { EmptyState };

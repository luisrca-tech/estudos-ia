import { cn } from "@estudos-ia/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlertIcon, CircleCheckIcon, ClockIcon, HighlighterIcon, InfoIcon } from "lucide-react";
import * as React from "react";

const alertVariants = cva("flex gap-3 rounded-md border border-l-4 p-4", {
  variants: {
    tone: {
      info: "border-line border-l-accent bg-surface",
      success: "border-success/30 border-l-success bg-success-soft",
      warning: "border-warning/30 border-l-warning bg-warning-soft",
      danger: "border-danger/30 border-l-danger bg-danger-soft",
      // Something changed and wants a look; not a problem.
      highlight: "border-line border-l-highlight bg-surface",
    },
  },
  defaultVariants: { tone: "info" },
});

const ICONS = { info: InfoIcon, success: CircleCheckIcon, warning: ClockIcon, danger: CircleAlertIcon, highlight: HighlighterIcon };
const ICON_COLOR = { info: "text-accent", success: "text-success", warning: "text-warning", danger: "text-danger", highlight: "text-foreground" };

type AlertProps = Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof alertVariants> & {
    title: React.ReactNode;
    /** Buttons or links, shown to the right on wide screens. */
    actions?: React.ReactNode;
  };

function Alert({ className, tone, title, actions, children, ...props }: AlertProps) {
  const resolved = tone ?? "info";
  const Icon = ICONS[resolved];
  return (
    <div
      data-slot="alert"
      role={resolved === "danger" ? "alert" : "status"}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", ICON_COLOR[resolved])} />
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          {children ? <div className="mt-0.5 text-sm text-muted-foreground">{children}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export { Alert };

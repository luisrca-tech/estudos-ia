import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

type PageShellProps = React.ComponentProps<"main"> & {
  /** `reading` for long text (45rem); `wide` for lists and the dashboard (65rem). */
  width?: "reading" | "wide";
};

function PageShell({ width = "wide", className, ...props }: PageShellProps) {
  return (
    <main
      data-slot="page-shell"
      className={cn(
        "mx-auto flex w-full flex-col gap-12 px-4 pt-8 pb-24 sm:px-6",
        width === "reading" ? "max-w-reading" : "max-w-wide",
        className,
      )}
      {...props}
    />
  );
}

type PageHeaderProps = {
  /** Context line above the title, only when it carries information (e.g. the module kicker). */
  kicker?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

function PageHeader({ kicker, title, description, actions, className }: PageHeaderProps) {
  return (
    <header data-slot="page-header" className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {kicker ? <p className="mb-1 text-sm font-medium text-muted-foreground">{kicker}</p> : null}
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description ? <div className="mt-3 max-w-[68ch] font-serif text-lg text-muted-foreground">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

type SectionProps = Omit<React.ComponentProps<"section">, "title"> & {
  title: React.ReactNode;
  /** Small count or status shown beside the title. */
  aside?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
};

function Section({ title, aside, description, actions, className, children, ...props }: SectionProps) {
  return (
    <section data-slot="section" className={cn("flex flex-col gap-4", className)} {...props}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-line pb-2">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-x-3 gap-y-1 font-serif text-xl font-semibold">
            {title}
            {aside}
          </h2>
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export { PageHeader, PageShell, Section };

"use client";

import { EmptyState } from "@estudos-ia/ui/components/empty-state";
import { ErrorState } from "@estudos-ia/ui/components/error-state";
import { Skeleton } from "@estudos-ia/ui/components/skeleton";
import { cn } from "@estudos-ia/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";

import { RoutineChecklist } from "@/components/routine-checklist";
import type { Cadence } from "@/lib/format";
import { DB_HINT } from "@/lib/labels";
import { historyLabel, periodHeading } from "@/lib/routine-labels";
import { useTRPC, type RouterOutputs } from "@/utils/trpc";

type Routine = RouterOutputs["routines"]["current"]["daily"];

/** How many past periods each card shows under "Antes". */
const COLUMNS: ReadonlyArray<{ cadence: Cadence; title: string; past: number }> = [
  { cadence: "daily", title: "Diária", past: 5 },
  { cadence: "weekly", title: "Semanal", past: 3 },
  { cadence: "monthly", title: "Mensal", past: 2 },
];

function History({ cadence, routine, past }: { cadence: Cadence; routine: Routine; past: number }) {
  const trpc = useTRPC();
  const history = useQuery(trpc.routines.history.queryOptions({ cadence }));

  if (history.isPending) return <Skeleton className="h-20" />;
  if (history.isError) {
    return (
      <ErrorState title="O banco local não respondeu." onRetry={() => history.refetch()}>
        {DB_HINT}
      </ErrorState>
    );
  }

  // The current period is the checklist above; history starts at the previous one.
  const rows = history.data.filter((entry) => entry.periodKey !== routine.periodKey).slice(0, past);
  if (rows.length === 0) return <p className="text-[13px] text-muted-foreground">Nenhum período anterior ainda.</p>;

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((entry) => {
        const cells = routine.items.map((item) => entry.checkedLabels.includes(item.label));
        return (
          <li key={entry.periodKey} className="flex items-center gap-3 text-[13px]">
            <span className="w-[5.75rem] flex-none text-muted-foreground">{historyLabel(cadence, entry.periodKey)}</span>
            <span role="img" aria-label={`${entry.done} de ${entry.total} feitos`} className="inline-flex gap-[3px]">
              {cells.map((done, index) => (
                <span key={index} className={cn("size-3.5 rounded-[2px]", done ? "bg-success" : "bg-surface-sunken")} />
              ))}
            </span>
            <span className={cn("ml-auto font-mono", entry.complete ? "text-success" : "text-muted-foreground")}>
              {entry.done}/{entry.total}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function RoutineCard({ column, routine, now }: { column: (typeof COLUMNS)[number]; routine: Routine; now: Date }) {
  const done = routine.items.filter((item) => item.checked).length;
  // The daily rhythm carries its time ("30–45 min") on the items.
  const time = column.cadence === "daily" ? routine.items[0]?.hint : null;

  return (
    <section aria-labelledby={`routine-${column.cadence}`} className="flex flex-col rounded-lg border border-line bg-surface">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="flex flex-col gap-0.5">
          <h2 id={`routine-${column.cadence}`} className="font-serif text-[22px] font-semibold">
            {column.title}
          </h2>
          <span className="text-[13px] text-muted-foreground">
            {periodHeading(column.cadence, now)}
            {time ? ` · ${time}` : ""}
          </span>
        </div>
        <span
          aria-label={`${done} de ${routine.items.length} feitos`}
          className={cn("font-mono text-[22px] font-medium", routine.complete ? "text-success" : "text-foreground")}
        >
          {done}/{routine.items.length}
        </span>
      </div>
      <div className="px-5 pb-2">
        {routine.items.length === 0 ? (
          <EmptyState title="Nenhum item nesta rotina.">Os itens vêm de content/routines.json; rode npm run db:seed.</EmptyState>
        ) : (
          <RoutineChecklist items={routine.items} hints divided />
        )}
      </div>
      <div className="flex flex-col gap-2 rounded-b-lg border-t border-line bg-background px-5 pt-3.5 pb-[1.125rem]">
        <span className="text-xs font-medium text-muted-foreground">Antes</span>
        <History cadence={column.cadence} routine={routine} past={column.past} />
      </div>
    </section>
  );
}

export function RoutinesScreen() {
  const trpc = useTRPC();
  const routines = useQuery(trpc.routines.current.queryOptions(undefined, { refetchInterval: 60_000 }));
  const now = new Date();

  return (
    <main className="mx-auto flex w-full max-w-page flex-col gap-8 px-4 pt-8 pb-24 sm:px-8 sm:pt-12">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-serif text-3xl font-semibold sm:text-[2.375rem] sm:leading-[1.15]">Rotinas</h1>
        <p className="text-muted-foreground">Três ritmos do método. Cada período fecha sozinho; o que ficou aberto vai para o histórico.</p>
      </header>
      {routines.isPending ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-5" role="status" aria-label="Carregando rotinas">
          {COLUMNS.map((column) => (
            <Skeleton key={column.cadence} className="h-96 rounded-lg" />
          ))}
        </div>
      ) : routines.isError ? (
        <ErrorState title="O banco local não respondeu." onRetry={() => routines.refetch()}>
          {DB_HINT}
        </ErrorState>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(290px,100%),1fr))] items-start gap-5">
          {COLUMNS.map((column) => (
            <RoutineCard key={column.cadence} column={column} routine={routines.data[column.cadence]} now={now} />
          ))}
        </div>
      )}
    </main>
  );
}

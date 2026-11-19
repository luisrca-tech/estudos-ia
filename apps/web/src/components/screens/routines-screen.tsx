"use client";

import { Badge } from "@estudos-ia/ui/components/badge";
import { Card } from "@estudos-ia/ui/components/card";
import { EmptyState } from "@estudos-ia/ui/components/empty-state";
import { ErrorState } from "@estudos-ia/ui/components/error-state";
import { PageHeader, PageShell } from "@estudos-ia/ui/components/page";
import { Skeleton, SkeletonLines } from "@estudos-ia/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";

import { RoutineChecklist } from "@/components/routine-checklist";
import { formatPeriod, type Cadence } from "@/lib/format";
import { DB_HINT } from "@/lib/labels";
import { useTRPC, type RouterOutputs } from "@/utils/trpc";

type Routine = RouterOutputs["routines"]["current"]["daily"];

const COLUMNS: ReadonlyArray<{ cadence: Cadence; title: string; complete: string; history: string; current: (key: string) => string }> = [
  { cadence: "daily", title: "Diária", complete: "dia completo", history: "Últimos 30 dias", current: (key) => `Hoje, ${formatPeriod("daily", key)}` },
  { cadence: "weekly", title: "Semanal", complete: "semana completa", history: "Últimas 12 semanas", current: (key) => formatPeriod("weekly", key) },
  { cadence: "monthly", title: "Mensal", complete: "mês completo", history: "Últimos 12 meses", current: (key) => formatPeriod("monthly", key) },
];

function History({ cadence, title, currentKey }: { cadence: Cadence; title: string; currentKey: string }) {
  const trpc = useTRPC();
  const history = useQuery(trpc.routines.history.queryOptions({ cadence }));

  if (history.isPending) return <SkeletonLines lines={4} />;
  if (history.isError) {
    return (
      <ErrorState title="Não foi possível carregar o histórico." onRetry={() => history.refetch()}>
        {DB_HINT}
      </ErrorState>
    );
  }

  // The current period is the checklist above; history starts at the previous one.
  const past = history.data.filter((entry) => entry.periodKey !== currentKey);
  const withChecks = past.filter((entry) => entry.done > 0).length;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="flex items-baseline justify-between gap-2 text-sm font-medium">
        {title}
        <span className="font-normal text-muted-foreground">
          {withChecks === 0 ? "nada marcado ainda" : `${withChecks} com itens feitos`}
        </span>
      </h3>
      <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-sm border border-line" tabIndex={0} aria-label={title}>
        {past.map((entry) => (
          <li key={entry.periodKey} className="px-3 py-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className={entry.done === 0 ? "text-muted-foreground" : undefined}>{formatPeriod(cadence, entry.periodKey)}</span>
              <Badge tone={entry.complete ? "success" : entry.done > 0 ? "warning" : "neutral"} className="tabular-nums">
                {entry.done}/{entry.total}
              </Badge>
            </div>
            {entry.done > 0 && !entry.complete ? (
              <p className="mt-1 text-xs text-muted-foreground">Feito: {entry.checkedLabels.map((label) => label.replaceAll("**", "")).join("; ")}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoutineColumn({ column, routine }: { column: (typeof COLUMNS)[number]; routine: Routine }) {
  const done = routine.items.filter((item) => item.checked).length;
  const hint = routine.items[0]?.hint;

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-2xl font-semibold">{column.title}</h2>
          <Badge tone={routine.complete ? "success" : "neutral"}>
            {routine.complete ? column.complete : `${done} de ${routine.items.length}`}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {column.current(routine.periodKey)}
          {hint ? `, ${hint}` : ""}
        </p>
      </div>
      {routine.items.length === 0 ? (
        <EmptyState title="Nenhum item nesta rotina.">Os itens vêm de content/routines.json; rode npm run db:seed.</EmptyState>
      ) : (
        <RoutineChecklist items={routine.items} />
      )}
      <div className="border-t border-line pt-4">
        <History cadence={column.cadence} title={column.history} currentKey={routine.periodKey} />
      </div>
    </Card>
  );
}

export function RoutinesScreen() {
  const trpc = useTRPC();
  const routines = useQuery(trpc.routines.current.queryOptions(undefined, { refetchInterval: 60_000 }));

  return (
    <PageShell>
      <PageHeader
        title="Rotinas"
        description="Três ritmos: um pouco todo dia, um exercício por semana e uma síntese por mês. Períodos passados ficam como histórico e não mudam."
      />
      {routines.isPending ? (
        <div className="grid gap-6 lg:grid-cols-3" role="status" aria-label="Carregando rotinas">
          {COLUMNS.map((column) => (
            <Skeleton key={column.cadence} className="h-96 rounded-md" />
          ))}
        </div>
      ) : routines.isError ? (
        <ErrorState title="Não foi possível carregar as rotinas." onRetry={() => routines.refetch()}>
          {DB_HINT}
        </ErrorState>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          {COLUMNS.map((column) => (
            <RoutineColumn key={column.cadence} column={column} routine={routines.data[column.cadence]} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

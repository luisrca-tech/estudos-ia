"use client";

import { Alert } from "@estudos-ia/ui/components/alert";
import { Badge } from "@estudos-ia/ui/components/badge";
import { buttonVariants } from "@estudos-ia/ui/components/button";
import { Card } from "@estudos-ia/ui/components/card";
import { ErrorState } from "@estudos-ia/ui/components/error-state";
import { Field } from "@estudos-ia/ui/components/field";
import { PageHeader, PageShell, Section } from "@estudos-ia/ui/components/page";
import { Select } from "@estudos-ia/ui/components/select";
import { Skeleton, SkeletonLines } from "@estudos-ia/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { RoutineChecklist } from "@/components/routine-checklist";
import { StartSession } from "@/components/start-session";
import { formatDateTime, formatLongDay, formatPeriod, plural } from "@/lib/format";
import { DB_HINT } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { useTRPC, type RouterOutputs } from "@/utils/trpc";

type Today = RouterOutputs["today"]["get"];
type Routine = Today["routines"]["daily"];

function SummaryAlerts({ overdue }: { overdue: Today["summaryAlerts"]["overdue"] }) {
  return (
    <Section title="Alertas" aside={<Badge tone="danger">{plural(overdue.length, "resumo atrasado", "resumos atrasados")}</Badge>}>
      <ul className="flex flex-col gap-3">
        {overdue.map((session) => (
          <li key={session.id}>
            <Alert
              tone="danger"
              title={`Resumo atrasado há ${session.summary.hours} h: ${session.module.kicker}`}
              actions={
                <Link
                  href={routes.newNote(session.module.slug, { type: "summary", sessionId: session.id })}
                  className={buttonVariants({ variant: "primary", size: "sm" })}
                >
                  Escrever resumo
                </Link>
              }
            >
              Sessão de {formatDateTime(session.startedAt)}, {session.module.title}. O prazo de 24 h já passou.
            </Alert>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function PendingSummaries({ pending }: { pending: Today["summaryAlerts"]["pending"] }) {
  return (
    <Section title="Resumos pendentes">
      <ul className="flex flex-col gap-3">
        {pending.map((session) => (
          <li key={session.id}>
            <Alert
              tone="warning"
              title={`Escrever resumo (faltam ${session.summary.hours} h): ${session.module.kicker}`}
              actions={
                <Link
                  href={routes.newNote(session.module.slug, { type: "summary", sessionId: session.id })}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Escrever resumo
                </Link>
              }
            >
              Sessão de {formatDateTime(session.startedAt)}, {session.module.title}.
            </Alert>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ReviewsDue({ reviews }: { reviews: Today["reviewsDue"] }) {
  return (
    <Section title="Revisões de hoje">
      {reviews.count === 0 ? (
        <p className="text-muted-foreground">
          Nenhuma revisão para hoje. Cada nota nova entra na fila no dia seguinte.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="flex flex-wrap items-center gap-3">
            <span className="font-serif text-2xl font-semibold">{plural(reviews.count, "revisão", "revisões")}</span>
            {reviews.overdueCount > 0 ? (
              <Badge tone="danger">{plural(reviews.overdueCount, "atrasada", "atrasadas")}</Badge>
            ) : null}
          </p>
          <Link href="/reviews" className={buttonVariants({ variant: "primary" })}>
            Começar revisão
          </Link>
        </div>
      )}
    </Section>
  );
}

function CompactRoutine({ cadence, routine }: { cadence: "weekly" | "monthly"; routine: Routine }) {
  const pending = routine.items.filter((item) => !item.checked);
  const done = routine.items.length - pending.length;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">
          {formatPeriod(cadence, routine.periodKey)}
        </h3>
        <Badge tone={routine.complete ? "success" : "neutral"}>
          {routine.complete ? "tudo feito" : `${done} de ${routine.items.length}`}
        </Badge>
      </div>
      {pending.length > 0 ? <RoutineChecklist items={pending} /> : null}
    </div>
  );
}

function Routines({ routines }: { routines: Today["routines"] }) {
  const { daily } = routines;
  const done = daily.items.filter((item) => item.checked).length;
  return (
    <Section
      title="Rotina de hoje"
      aside={
        <Badge tone={daily.complete ? "success" : "neutral"}>
          {daily.complete ? "dia completo" : `${done} de ${daily.items.length}`}
        </Badge>
      }
      actions={
        <Link href="/routines" className={buttonVariants({ variant: "link", size: "sm" })}>
          Ver histórico
        </Link>
      }
    >
      <RoutineChecklist items={daily.items} />
      <div className="flex flex-col gap-5 border-t border-line pt-4">
        <CompactRoutine cadence="weekly" routine={routines.weekly} />
        <CompactRoutine cadence="monthly" routine={routines.monthly} />
      </div>
    </Section>
  );
}

function StudyNow({ today }: { today: Today }) {
  const trpc = useTRPC();
  const modules = useQuery(trpc.modules.list.queryOptions({ includeArchived: true }));
  const [chosen, setChosen] = useState<string | null>(null);
  const moduleId = chosen ?? today.suggestedModule?.id;
  const options = modules.data?.filter((module) => module.archivedAt === null) ?? [];
  const selected = options.find((module) => module.id === moduleId) ?? today.suggestedModule;

  return (
    <Section title="Estudar agora">
      {today.activeSession ? (
        <Alert tone="info" title={`Sessão em andamento: ${today.activeSession.module.kicker}`}>
          O cronômetro está no topo da página. Conclua ou cancele antes de iniciar outra.
        </Alert>
      ) : null}
      <Card className="flex flex-col gap-5">
        {selected ? (
          <div>
            <p className="text-sm text-muted-foreground">
              {chosen ? selected.kicker : `Sugerido: ${selected.kicker}`}
            </p>
            <p className="font-serif text-xl font-semibold">
              <Link href={routes.module(selected.slug)} className="underline-offset-[3px] hover:underline">
                {selected.title}
              </Link>
            </p>
          </div>
        ) : null}
        <Field label="Módulo" htmlFor="study-module">
          <Select id="study-module" value={moduleId ?? ""} onChange={(event) => setChosen(event.target.value)} disabled={options.length === 0}>
            {options.length === 0 ? <option value="">Carregando módulos…</option> : null}
            {options.map((module) => (
              <option key={module.id} value={module.id}>
                {module.kicker}: {module.title}
              </option>
            ))}
          </Select>
        </Field>
        <StartSession moduleId={moduleId} />
      </Card>
    </Section>
  );
}

export function TodayScreen() {
  const trpc = useTRPC();
  const today = useQuery(trpc.today.get.queryOptions(undefined, { refetchInterval: 60_000 }));

  if (today.isPending) {
    return (
      <PageShell>
        <div className="flex flex-col gap-6" role="status" aria-label="Carregando o painel de hoje">
          <Skeleton className="h-10 w-80 max-w-full" />
          <SkeletonLines lines={4} />
          <Skeleton className="h-40 rounded-md" />
        </div>
      </PageShell>
    );
  }

  if (today.isError) {
    return (
      <PageShell>
        <PageHeader title="Hoje" />
        <ErrorState title="Não foi possível carregar o painel de hoje." onRetry={() => today.refetch()}>
          {DB_HINT}
        </ErrorState>
      </PageShell>
    );
  }

  const data = today.data;
  const { overdue, pending } = data.summaryAlerts;
  const nothingPending = overdue.length === 0 && pending.length === 0 && data.reviewsDue.count === 0;

  return (
    <PageShell>
      <PageHeader kicker="Hoje" title={formatLongDay(data.date)} />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-12">
          {nothingPending ? (
            <Alert tone="success" title="Tudo em dia.">
              Sem resumos pendentes e sem revisões para hoje.
            </Alert>
          ) : (
            <>
              {overdue.length > 0 ? <SummaryAlerts overdue={overdue} /> : null}
              <ReviewsDue reviews={data.reviewsDue} />
            </>
          )}
          <div className="lg:hidden">
            <Routines routines={data.routines} />
          </div>
          {pending.length > 0 ? <PendingSummaries pending={pending} /> : null}
          <StudyNow today={data} />
        </div>
        <aside className="hidden lg:block">
          <Routines routines={data.routines} />
        </aside>
      </div>
    </PageShell>
  );
}

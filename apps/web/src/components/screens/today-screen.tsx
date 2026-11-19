"use client";

import { Badge } from "@estudos-ia/ui/components/badge";
import { Button, buttonVariants, Kbd } from "@estudos-ia/ui/components/button";
import { ErrorState } from "@estudos-ia/ui/components/error-state";
import { Select } from "@estudos-ia/ui/components/select";
import { Skeleton, SkeletonLines } from "@estudos-ia/ui/components/skeleton";
import { cn } from "@estudos-ia/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon, CircleCheckIcon, ClockIcon, PlayIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { RoutineChecklist } from "@/components/routine-checklist";
import { formatDayTitle, formatDuration, formatSessionWhen, formatTime, moduleLabel, moduleNumber, plural } from "@/lib/format";
import { DB_HINT, DEFAULT_SESSION_MINUTES } from "@/lib/labels";
import { periodRemaining, splitRoutineLabel } from "@/lib/routine-labels";
import { routes } from "@/lib/routes";
import { suggestionReason } from "@/lib/study-labels";
import { buildTodayQueue, type QueueStep } from "@/lib/today-queue";
import { useStartSession } from "@/lib/use-start-session";
import { useTRPC, type RouterOutputs } from "@/utils/trpc";

type Today = RouterOutputs["today"]["get"];
type AlertSession = Today["summaryAlerts"]["overdue"][number];

const summaryHref = (session: AlertSession) => routes.newNote(session.module.slug, { type: "summary", sessionId: session.id });

/** Marker of a queue step (board "Passo da fila"): next filled, pending outlined, done green, overdue red. */
function StepMarker({ step }: { step: QueueStep }) {
  const base = "flex size-7 flex-none items-center justify-center rounded-full font-mono text-[13px]";
  if (step.state === "done") return <span className={cn(base, "bg-success-soft font-medium text-success")}>✓</span>;
  if (step.state === "next") return <span className={cn(base, "bg-foreground font-semibold text-background")}>{step.number}</span>;
  if (step.overdue) return <span className={cn(base, "border-[1.5px] border-danger bg-danger-soft font-medium text-danger")}>!</span>;
  return <span className={cn(base, "border-[1.5px] border-line-strong font-medium text-muted-foreground")}>{step.number}</span>;
}

function OverdueBadge() {
  return (
    <Badge tone="danger">
      <CircleAlertIcon aria-hidden />
      Atrasado
    </Badge>
  );
}

function StepRow({ step, last, children }: { step: QueueStep; last: boolean; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4" aria-current={step.state === "next" ? "step" : undefined}>
      <div className="flex flex-col items-center">
        <StepMarker step={step} />
        {last ? null : <span aria-hidden className="my-1 w-px flex-1 bg-line" />}
      </div>
      <div className={cn("min-w-0", last ? "" : "pb-7")}>{children}</div>
    </li>
  );
}

function StepHeading({ step, title, meta }: { step: QueueStep; title: React.ReactNode; meta?: React.ReactNode }) {
  const next = step.state === "next";
  return (
    <div className="flex flex-col gap-0.5">
      {next ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-foreground">Próximo</span>
          {step.overdue ? <OverdueBadge /> : null}
        </div>
      ) : null}
      <h2
        className={cn(
          "font-serif leading-[1.3] font-semibold",
          next ? "text-[22px]" : "text-xl",
          step.state === "done" && "text-muted-foreground line-through",
        )}
      >
        {title}
      </h2>
      {meta ? <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">{meta}</div> : null}
    </div>
  );
}

function SessionList({ sessions, tone }: { sessions: AlertSession[]; tone: "danger" | "warning" }) {
  return (
    <div className="rounded-md border border-line bg-surface">
      {sessions.map((session, index) => (
        <div key={session.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3", index > 0 && "border-t border-line")}>
          <div className="flex min-w-0 flex-[1_1_280px] flex-col">
            <span className="font-medium">{moduleLabel(session.module.kicker, session.module.title)}</span>
            <span className="text-[13px] text-muted-foreground">{formatSessionWhen(session.startedAt)}</span>
          </div>
          <span className={cn("text-[13px] font-medium", tone === "danger" ? "text-danger" : "text-warning")}>
            {tone === "danger" ? `há ${session.summary.hours} h` : `faltam ${session.summary.hours} h`}
          </span>
          <Link href={summaryHref(session)} className={buttonVariants({ variant: "outline", size: "sm", className: "min-h-10" })}>
            Escrever resumo
          </Link>
        </div>
      ))}
    </div>
  );
}

function OverdueStep({ step, sessions, last }: { step: QueueStep; sessions: AlertSession[]; last: boolean }) {
  const title = sessions.length === 1 ? "Escrever o resumo atrasado" : `Escrever ${sessions.length} resumos atrasados`;
  const first = sessions[0]!;
  if (step.state !== "next") {
    return (
      <StepRow step={step} last={last}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex-[1_1_300px]">
            <StepHeading step={step} title={title} meta={<><span>{moduleNumber(first.module.kicker)} · há {first.summary.hours} h</span><OverdueBadge /></>} />
          </div>
          <Link href={summaryHref(first)} className={buttonVariants({ variant: "outline" })}>
            Escrever resumo
          </Link>
        </div>
      </StepRow>
    );
  }
  return (
    <StepRow step={step} last={last}>
      <div className="flex flex-col gap-3">
        <StepHeading
          step={step}
          title={title}
          meta="Sessões sem resumo com suas palavras depois de 24 h. Escreva de memória, sem abrir a fonte."
        />
        <SessionList sessions={sessions} tone="danger" />
      </div>
    </StepRow>
  );
}

function ReviewsStep({
  step,
  reviews,
  modules,
  last,
}: {
  step: QueueStep;
  reviews: Today["reviewsDue"];
  modules: string[];
  last: boolean;
}) {
  const meta = [
    reviews.overdueCount > 0 ? plural(reviews.overdueCount, "atrasada", "atrasadas") : null,
    modules.length > 0 ? modulesSentence(modules) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <StepRow step={step} last={last}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex-[1_1_300px]">
          <StepHeading
            step={step}
            title={reviews.count === 1 ? "Responder 1 pergunta de cabeça" : `Responder ${reviews.count} perguntas de cabeça`}
            meta={meta || undefined}
          />
        </div>
        <Link href="/reviews" className={buttonVariants({ variant: step.state === "next" ? "primary" : "outline" })}>
          Começar revisão
          <Kbd inverted={step.state === "next"}>R</Kbd>
        </Link>
      </div>
    </StepRow>
  );
}

/** "Módulos 1, 3 e 4" from kickers such as "Módulo 1 · Fundamentos". */
function modulesSentence(kickers: string[]): string {
  const numbers = kickers
    .map((kicker) => kicker.match(/^Módulo (\d+)/)?.[1] ?? moduleNumber(kicker))
    .sort((a, b) => (Number(a) || 99) - (Number(b) || 99));
  if (numbers.length === 1) return kickers[0]!.startsWith("Módulo") ? `Módulo ${numbers[0]}` : numbers[0]!;
  const list = `${numbers.slice(0, -1).join(", ")} e ${numbers.at(-1)}`;
  return kickers.every((kicker) => kicker.startsWith("Módulo")) ? `Módulos ${list}` : list;
}

function PendingStep({ step, sessions, last }: { step: QueueStep; sessions: AlertSession[]; last: boolean }) {
  if (sessions.length === 1) {
    const session = sessions[0]!;
    return (
      <StepRow step={step} last={last}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex-[1_1_300px]">
            <StepHeading
              step={step}
              title={`Resumir a sessão das ${formatTime(session.startedAt)}`}
              meta={
                <>
                  <span>{moduleLabel(session.module.kicker, session.module.title)}</span>
                  <Badge tone="warning">
                    <ClockIcon aria-hidden />
                    Faltam {session.summary.hours} h
                  </Badge>
                </>
              }
            />
          </div>
          <Link href={summaryHref(session)} className={buttonVariants({ variant: step.state === "next" ? "primary" : "outline" })}>
            Escrever resumo
          </Link>
        </div>
      </StepRow>
    );
  }
  const soonest = Math.min(...sessions.map((session) => session.summary.hours ?? 24));
  return (
    <StepRow step={step} last={last}>
      <div className="flex flex-col gap-3">
        <StepHeading
          step={step}
          title={`Resumir ${sessions.length} sessões`}
          meta={
            <Badge tone="warning">
              <ClockIcon aria-hidden />
              O primeiro prazo acaba em {soonest} h
            </Badge>
          }
        />
        {step.state === "next" ? <SessionList sessions={sessions} tone="warning" /> : null}
      </div>
    </StepRow>
  );
}

function RoutineStep({ step, routine, last }: { step: QueueStep; routine: Today["routines"]["daily"]; last: boolean }) {
  const done = routine.items.filter((item) => item.checked).length;
  return (
    <StepRow step={step} last={last}>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <StepHeading step={step} title="Rotina diária" />
          <span className="text-sm text-muted-foreground">
            {done} de {routine.items.length}
          </span>
        </div>
        {step.state === "done" ? null : <RoutineChecklist items={routine.items} />}
      </div>
    </StepRow>
  );
}

function SessionPanel({ today }: { today: Today }) {
  const trpc = useTRPC();
  const modules = useQuery(trpc.modules.list.queryOptions());
  const { start, pending } = useStartSession();
  const [chosen, setChosen] = useState<string | null>(null);
  const options = modules.data ?? [];
  const moduleId = chosen ?? today.suggestedModule?.id;
  const selected = options.find((module) => module.id === moduleId);
  const reason = selected
    ? suggestionReason({ masteryLevel: selected.masteryLevel, lastSessionAt: selected.lastSessionAt }, new Date())
    : null;
  const running = Boolean(today.activeSession);

  return (
    <section aria-labelledby="sessao" className="flex flex-col gap-4 rounded-md border border-line bg-surface p-6">
      <div className="flex flex-col gap-1">
        <h2 id="sessao" className="text-sm font-medium text-muted-foreground">
          Sessão de foco
        </h2>
        <span className="font-mono text-4xl leading-[1.1] font-medium tabular-nums">25:00</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="study-module" className="text-sm font-medium">
          Módulo
        </label>
        <Select
          id="study-module"
          value={moduleId ?? ""}
          onChange={(event) => setChosen(event.target.value)}
          disabled={options.length === 0}
          className="[&_select]:h-11"
        >
          {options.length === 0 ? <option value="">Carregando módulos…</option> : null}
          {options.map((module) => (
            <option key={module.id} value={module.id}>
              {moduleLabel(module.kicker, module.title)}
            </option>
          ))}
        </Select>
        {reason ? (
          <span className="text-[13px] text-muted-foreground">
            {moduleId === today.suggestedModule?.id ? reason : reason.replace("Sugerido: degrau", "Degrau")}
          </span>
        ) : null}
      </div>
      <Button size="lg" loading={pending} disabled={!moduleId || running} onClick={() => moduleId && start(moduleId, DEFAULT_SESSION_MINUTES)}>
        <PlayIcon aria-hidden className="fill-current" />
        Iniciar sessão de 25 min
      </Button>
      <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        {running ? (
          "Há uma sessão em andamento: o relógio está no rodapé."
        ) : (
          <>
            Atalho <Kbd>S</Kbd> em qualquer página
          </>
        )}
      </span>
    </section>
  );
}

function OpenCycles({ routines }: { routines: Today["routines"] }) {
  const now = new Date();
  const rows = [
    { name: "Semana", routine: routines.weekly, left: periodRemaining("weekly", now) },
    { name: "Mês", routine: routines.monthly, left: periodRemaining("monthly", now) },
  ];
  return (
    <section aria-labelledby="ciclos" className="flex flex-col gap-3 text-sm">
      <h2 id="ciclos" className="text-sm font-medium text-muted-foreground">
        Também em aberto
      </h2>
      {rows.map(({ name, routine, left }, index) => {
        const open = routine.items.filter((item) => !item.checked);
        const done = routine.items.length - open.length;
        return (
          <div key={name} className={cn("flex flex-col gap-1", index === 0 && "border-b border-line pb-3")}>
            <div className="flex justify-between gap-3">
              <span className="font-medium">{name}</span>
              <span className={routine.complete ? "text-success" : "text-muted-foreground"}>
                {done} de {routine.items.length} · {left}
              </span>
            </div>
            <span className="text-muted-foreground">
              {open.length === 0
                ? "Tudo feito neste período."
                : `${open
                    .map((item, position) => {
                      const text = splitRoutineLabel(item.label).text.replaceAll("**", "");
                      return position === 0 ? text : `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
                    })
                    .join("; ")}.`}
            </span>
          </div>
        );
      })}
      <Link href="/routines" className={buttonVariants({ variant: "link", size: "sm", className: "self-start" })}>
        Abrir rotinas
      </Link>
    </section>
  );
}

export function TodayScreen() {
  const trpc = useTRPC();
  const today = useQuery(trpc.today.get.queryOptions(undefined, { refetchInterval: 60_000 }));
  const reviews = useQuery(trpc.reviews.due.queryOptions());
  const sessions = useQuery(trpc.sessions.list.queryOptions({ limit: 50 }));

  if (today.isPending) {
    return (
      <main className="mx-auto w-full max-w-page px-4 pt-12 pb-24 sm:px-8">
        <div className="flex flex-col gap-6" role="status" aria-label="Carregando o painel de hoje">
          <Skeleton className="h-11 w-96 max-w-full" />
          <SkeletonLines lines={4} />
          <Skeleton className="h-40 rounded-md" />
        </div>
      </main>
    );
  }

  if (today.isError) {
    return (
      <main className="mx-auto w-full max-w-page px-4 pt-12 pb-24 sm:px-8">
        <ErrorState title="O banco local não respondeu." onRetry={() => today.refetch()}>
          {DB_HINT}
        </ErrorState>
      </main>
    );
  }

  const data = today.data;
  const { overdue, pending } = data.summaryAlerts;
  const daily = data.routines.daily;
  const queue = buildTodayQueue({
    overdue,
    pending,
    reviews: data.reviewsDue,
    routine: { done: daily.items.filter((item) => item.checked).length, total: daily.items.length },
  });
  const reviewModules = [...new Set((reviews.data ?? []).map((review) => review.moduleKicker))];
  const sessionsToday = (sessions.data ?? []).filter(
    (session) => session.status === "completed" && formatDayKey(session.startedAt) === data.date,
  );
  const focusToday = sessionsToday.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0);
  const sessionsLine = plural(sessionsToday.length, "sessão hoje", "sessões hoje");
  const dayLine = queue.allDone
    ? sessionsToday.length > 0
      ? `${sessionsLine} · ${formatDuration(focusToday)}`
      : "Nenhuma sessão hoje"
    : `${plural(queue.openCount, "passo na fila", "passos na fila")} · ${sessionsLine}`;

  return (
    <div className="mx-auto flex w-full max-w-page flex-wrap items-start gap-12 px-4 pt-8 pb-24 sm:px-8 sm:pt-12">
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-8">
        <header className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">{formatDayTitle(data.date)}</h1>
          <span className="text-sm text-muted-foreground">{dayLine}</span>
        </header>

        {queue.allDone ? (
          <section className="flex flex-col gap-3 border-t border-line pt-14 pb-6">
            <CircleCheckIcon aria-hidden className="size-8 text-success" strokeWidth={1.5} />
            <h2 className="font-serif text-3xl font-semibold">Tudo em dia.</h2>
            <p className="max-w-[52ch] text-muted-foreground">
              Nenhum resumo devendo, nenhuma revisão para hoje e a rotina diária está feita. Se sobrar energia, mais uma
              sessão rende mais que reler.
            </p>
          </section>
        ) : (
          <ol aria-label="Fila do dia" className="flex flex-col">
            {queue.steps.map((step, index) => {
              const last = index === queue.steps.length - 1;
              if (step.kind === "overdue-summaries") return <OverdueStep key={step.kind} step={step} sessions={overdue} last={last} />;
              if (step.kind === "reviews")
                return <ReviewsStep key={step.kind} step={step} reviews={data.reviewsDue} modules={reviewModules} last={last} />;
              if (step.kind === "pending-summaries") return <PendingStep key={step.kind} step={step} sessions={pending} last={last} />;
              return <RoutineStep key={step.kind} step={step} routine={daily} last={last} />;
            })}
          </ol>
        )}
      </main>

      <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-6">
        <SessionPanel today={data} />
        <OpenCycles routines={data.routines} />
      </aside>
    </div>
  );
}

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

/** YYYY-MM-DD in São Paulo time. */
function formatDayKey(value: string | Date): string {
  return dayKeyFormat.format(new Date(value));
}

"use client";

import { Alert } from "@estudos-ia/ui/components/alert";
import { Button, buttonVariants, Kbd } from "@estudos-ia/ui/components/button";
import { EmptyState } from "@estudos-ia/ui/components/empty-state";
import { ErrorState } from "@estudos-ia/ui/components/error-state";
import { Skeleton, SkeletonLines } from "@estudos-ia/ui/components/skeleton";
import { Staircase } from "@estudos-ia/ui/components/step-ladder";
import { cn } from "@estudos-ia/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, PlayIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Markdown } from "@/components/markdown";
import { formatDate, formatDayMonth, formatDuration, formatLastSession } from "@/lib/format";
import { DB_HINT, DEFAULT_SESSION_MINUTES, LADDER_DESCRIPTIONS, LADDER_LABELS, noteTypeLabel } from "@/lib/labels";
import { changedPassages, describeChanges, type ModuleDiff } from "@/lib/module-diff";
import { routes } from "@/lib/routes";
import { uiActions } from "@/lib/ui-store";
import { useRefreshAll } from "@/lib/use-refresh";
import { useStartSession } from "@/lib/use-start-session";
import { errorCode, useTRPC, type RouterOutputs } from "@/utils/trpc";

type Module = RouterOutputs["modules"]["bySlug"];
type Reading = Module["content"]["readings"][number];

/** Passage that changed since the last visit; marked until "Ok, li". */
function Changed({ on, block, children }: { on: boolean; block?: boolean; children: React.ReactNode }) {
  if (!on) return <>{children}</>;
  const Element = block ? "div" : "span";
  return (
    <Element className="bg-[color-mix(in_srgb,var(--highlight)_55%,transparent)] px-0.5">
      <span className="sr-only">Trecho atualizado: </span>
      {children}
    </Element>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-serif text-2xl font-semibold">
      {children}
    </h2>
  );
}

function DecisionQuestions({ module, diff }: { module: Module; diff: ModuleDiff }) {
  const questions = module.content.decisionQuestions;
  if (questions.length === 0) return null;
  const cases = module.key === "casos";
  return (
    <section aria-labelledby="perguntas" className="flex flex-col gap-3.5">
      <SectionTitle id="perguntas">{cases ? "Como estudar um caso" : "Perguntas de decisão"}</SectionTitle>
      <p className="text-sm text-muted-foreground">Leve para a sessão. No fim, você deve conseguir responder sem a fonte.</p>
      <ol className="flex flex-col font-serif text-[17px] leading-[1.6]">
        {questions.map((question, index) => (
          <li key={question} className={cn("flex gap-4 border-t border-line py-3", index === questions.length - 1 && "border-b")}>
            <span className="pt-[3px] font-mono text-[13px] text-muted-foreground">{index + 1}</span>
            <span>
              <Changed on={diff.isChanged("decisionQuestions", question)}>
                <Markdown inline>{question}</Markdown>
              </Changed>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const NEW_ITEMS_SHOWN = 3;

function WhatIsNew({ module, diff }: { module: Module; diff: ModuleDiff }) {
  const [expanded, setExpanded] = useState(false);
  const { new: items, seen } = module.content;
  if (items.length === 0 && seen.length === 0) return null;
  // Changed items always stay visible, even when the list is collapsed.
  const visible = expanded ? items : items.filter((item, index) => index < NEW_ITEMS_SHOWN || diff.isChanged("new", item));
  const hidden = items.length - visible.length;

  return (
    <section aria-labelledby="novo" className="flex flex-col gap-3">
      <SectionTitle id="novo">O que é novo aqui</SectionTitle>
      {visible.length > 0 ? (
        <ul className="prose-estudo flex list-disc flex-col gap-2.5 pl-5">
          {visible.map((item) => (
            <li key={item}>
              <Changed on={diff.isChanged("new", item)}>
                <Markdown inline>{item}</Markdown>
              </Changed>
            </li>
          ))}
        </ul>
      ) : null}
      {expanded && seen.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <h3 className="text-sm font-medium text-muted-foreground">O que você já viu</h3>
          <ul className="prose-estudo flex list-disc flex-col gap-2 pl-5 text-muted-foreground">
            {seen.map((item) => (
              <li key={item}>
                <Changed on={diff.isChanged("seen", item)}>
                  <Markdown inline>{item}</Markdown>
                </Changed>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {hidden > 0 || seen.length > 0 ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="min-h-9 cursor-pointer self-start text-left text-sm font-medium text-accent hover:underline"
        >
          {expanded
            ? "Mostrar menos"
            : [hidden > 0 ? `Mais ${hidden} ${hidden === 1 ? "item" : "itens"}` : null, seen.length > 0 ? `ver também o que você já viu (${seen.length})` : null]
                .filter(Boolean)
                .join(" · ")
                .replace(/^v/, hidden > 0 ? "v" : "V")}
        </button>
      ) : null}
    </section>
  );
}

function ReadingRow({ reading, changed }: { reading: Reading; changed: boolean }) {
  return (
    <article className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 border-t border-line py-3.5">
      <div className="flex flex-col gap-0.5 text-[13px] text-muted-foreground">
        <span className="font-medium text-foreground">{reading.kind}</span>
        {reading.duration ? <span>{reading.duration}</span> : null}
        <span>
          Grau <span className="font-mono text-foreground">{reading.grade ?? "–"}</span>
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-serif text-[17px] font-semibold [&_a]:text-accent [&_a]:underline-offset-[3px]">
          <Changed on={changed}>
            <Markdown inline>{reading.title}</Markdown>
            <span aria-hidden className="text-accent"> ↗</span>
          </Changed>
        </p>
        {reading.why ? <p className="font-serif text-base leading-[1.65]">{reading.why}</p> : null}
      </div>
    </article>
  );
}

function Readings({ module, diff }: { module: Module; diff: ModuleDiff }) {
  const { readings } = module.content;
  if (readings.length === 0) return null;
  return (
    <section aria-labelledby="leituras" className="flex flex-col gap-1">
      <div className="mb-2.5">
        <SectionTitle id="leituras">Leituras</SectionTitle>
      </div>
      {readings.map((reading) => (
        <ReadingRow key={`${reading.url}-${reading.title}`} reading={reading} changed={diff.isChanged("readings", reading.url)} />
      ))}
    </section>
  );
}

function ExerciseAndSeed({ module, diff }: { module: Module; diff: ModuleDiff }) {
  const { exercise, seeds } = module.content;
  if (!exercise && !seeds) return null;
  return (
    <section aria-labelledby="exercicio" className="flex flex-col gap-3">
      {exercise ? (
        <>
          <SectionTitle id="exercicio">Exercício</SectionTitle>
          <div className="flex flex-col gap-3.5 rounded-md bg-surface-sunken px-6 py-5">
            <Changed on={diff.exercise} block>
              <Markdown>{exercise}</Markdown>
            </Changed>
            <Link href={routes.newNote(module.slug, { type: "evidence" })} className="self-start text-sm font-medium text-accent">
              Registrar como evidência
            </Link>
          </div>
        </>
      ) : null}
      {seeds ? (
        <div className="text-sm text-muted-foreground [&_a]:text-accent">
          <span className="font-medium text-foreground">{module.part === 1 ? "Semente para a Parte 2." : "Desde a Parte 1."}</span>{" "}
          <Changed on={diff.seeds}>
            <Markdown inline className="text-sm">
              {seeds}
            </Markdown>
          </Changed>
        </div>
      ) : null}
    </section>
  );
}

/** What it takes to reach the next step, and the action that gets there. */
const NEXT_STEP_ACTION: Record<number, { label: string; type?: "summary" | "decision" | "evidence"; session?: true }> = {
  0: { label: "Iniciar sessão de 25 min", session: true },
  1: { label: "Escrever resumo de memória", type: "summary" },
  2: { label: "Registrar uma decisão", type: "decision" },
  3: { label: "Registrar como evidência", type: "evidence" },
  4: { label: "Escrever um resumo para ensinar", type: "summary" },
};

function MyStep({ module, sessionRunning }: { module: Module; sessionRunning: boolean }) {
  const trpc = useTRPC();
  const refreshAll = useRefreshAll();
  const { start, pending } = useStartSession();
  const setMastery = useMutation(
    trpc.modules.setMastery.mutationOptions({
      onSuccess: () => refreshAll(),
      onError: (error) => toast.error("O degrau não foi salvo", { description: error.message }),
    }),
  );
  const level = setMastery.isPending ? setMastery.variables.level : module.progress.masteryLevel;
  const action = NEXT_STEP_ACTION[level];
  const requirement = LADDER_DESCRIPTIONS[level];

  return (
    <section aria-labelledby="degrau" className="flex flex-col gap-3.5 rounded-md border border-line bg-surface p-5">
      <h2 id="degrau" className="text-sm font-medium text-muted-foreground">
        Meu degrau
      </h2>
      <Staircase
        level={level}
        labels={LADDER_LABELS}
        disabled={setMastery.isPending}
        onLevelChange={(next) => setMastery.mutate({ moduleId: module.id, level: next })}
      />
      <div className="flex flex-col gap-2.5 border-t border-line pt-3">
        {requirement ? (
          <p className="text-sm">
            <span className="font-semibold">Para chegar ao {level + 1}:</span>{" "}
            {requirement.charAt(0).toLowerCase() + requirement.slice(1)}
          </p>
        ) : (
          <p className="text-sm">
            <span className="font-semibold">Degrau máximo.</span> Publicar ou ensinar mantém o assunto vivo.
          </p>
        )}
        {action?.session ? (
          <Button
            variant="outline"
            size="sm"
            className="min-h-10 self-start"
            loading={pending}
            disabled={sessionRunning}
            onClick={() => start(module.id, DEFAULT_SESSION_MINUTES)}
          >
            {action.label}
          </Button>
        ) : action?.type ? (
          <Link
            href={routes.newNote(module.slug, { type: action.type })}
            className={buttonVariants({ variant: "outline", size: "sm", className: "min-h-10 self-start" })}
          >
            {action.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function MyNotes({ module }: { module: Module }) {
  const trpc = useTRPC();
  const notes = useQuery(trpc.notes.listByModule.queryOptions({ moduleId: module.id }));
  return (
    <section aria-labelledby="notas" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id="notas" className="text-sm font-medium text-muted-foreground">
          Minhas notas{notes.data ? ` · ${notes.data.length}` : ""}
        </h2>
        <Link href={routes.newNote(module.slug)} className={buttonVariants({ size: "sm" })}>
          Nova nota
          <Kbd inverted className="text-[11px]">
            N
          </Kbd>
        </Link>
      </div>
      {notes.isPending ? (
        <SkeletonLines lines={3} />
      ) : notes.isError ? (
        <ErrorState title="O banco local não respondeu." onRetry={() => notes.refetch()}>
          {DB_HINT}
        </ErrorState>
      ) : notes.data.length === 0 ? (
        <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
          <strong className="font-medium">Nenhuma nota neste módulo.</strong>
          <span className="text-muted-foreground">Depois de uma sessão, escreva o resumo de memória.</span>
        </div>
      ) : (
        <ul className="flex flex-col">
          {notes.data.map((note) => (
            <li key={note.id}>
              <Link
                href={routes.note(note.id)}
                className="flex flex-col gap-0.5 border-t border-line py-2.5 text-foreground no-underline hover:text-accent"
              >
                <span className="text-xs text-muted-foreground">
                  {noteTypeLabel(note.type)} · {formatDayMonth(note.createdAt)}
                  {note.source === "html_import" ? " · importada" : ""}
                </span>
                <span className="font-serif text-base font-semibold">{note.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MySessions({ module }: { module: Module }) {
  const trpc = useTRPC();
  const sessions = useQuery(trpc.sessions.list.queryOptions({ moduleId: module.id, limit: 20 }));
  const now = new Date();
  const total = (sessions.data ?? []).reduce((sum, session) => sum + (session.status === "completed" ? (session.durationSeconds ?? 0) : 0), 0);

  return (
    <section aria-labelledby="sessoes" className="flex flex-col gap-1 text-sm">
      <h2 id="sessoes" className="mb-1 text-sm font-medium text-muted-foreground">
        Sessões{total > 0 ? ` · ${formatDuration(total)} no total` : ""}
      </h2>
      {sessions.isPending ? (
        <SkeletonLines lines={2} />
      ) : (sessions.data ?? []).length === 0 ? (
        <p className="border-t border-line py-2 text-muted-foreground">Nenhuma sessão ainda. Atalho S inicia uma de 25 min.</p>
      ) : (
        (sessions.data ?? []).map((session) => {
          const { state, hours } = session.summary;
          const [label, color] =
            session.status === "running"
              ? ["em andamento", "text-accent"]
              : session.status === "cancelled"
                ? ["cancelada", "text-muted-foreground"]
                : state === "covered"
                  ? ["resumo feito", "text-success"]
                  : state === "pending"
                    ? [`resumo: faltam ${hours} h`, "text-warning"]
                    : state === "overdue"
                      ? [`resumo atrasado há ${hours} h`, "text-danger"]
                      : ["sem cobrança de resumo", "text-muted-foreground"];
          const needsLink = state === "pending" || state === "overdue";
          return (
            <div key={session.id} className="flex justify-between gap-2 border-t border-line py-2">
              <span>{session.status === "running" ? "Agora" : capitalizeFirst(formatLastSession(session.startedAt, now))}</span>
              {needsLink ? (
                <Link
                  href={routes.newNote(module.slug, { type: "summary", sessionId: session.id })}
                  className={cn("font-medium", color)}
                >
                  {label}
                </Link>
              ) : (
                <span className={cn("font-medium", color)}>{label}</span>
              )}
            </div>
          );
        })
      )}
    </section>
  );
}

const capitalizeFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function TrailNav({ module }: { module: Module }) {
  const trpc = useTRPC();
  const modules = useQuery(trpc.modules.list.queryOptions());
  const list = modules.data ?? [];
  const index = list.findIndex((entry) => entry.id === module.id);
  const previous = index > 0 ? list[index - 1] : undefined;
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : undefined;
  const arrow = "inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-surface-sunken hover:text-foreground";

  return (
    <nav aria-label="Trilha" className="flex items-center justify-between gap-3 text-sm">
      <Link href={"/modules" as Route} className="inline-flex min-h-8 items-center gap-1.5 text-muted-foreground no-underline hover:text-foreground">
        <ArrowLeftIcon aria-hidden className="size-4" />
        Mapa da trilha
      </Link>
      <span className="inline-flex gap-1">
        {previous ? (
          <Link href={routes.module(previous.slug)} aria-label={`Módulo anterior: ${previous.title}`} className={arrow}>
            <ChevronLeftIcon aria-hidden className="size-4" />
          </Link>
        ) : null}
        {next ? (
          <Link href={routes.module(next.slug)} aria-label={`Próximo módulo: ${next.title}`} className={arrow}>
            <ChevronRightIcon aria-hidden className="size-4" />
          </Link>
        ) : null}
      </span>
    </nav>
  );
}

export function ModuleScreen({ slug }: { slug: string }) {
  const trpc = useTRPC();
  const refreshAll = useRefreshAll();
  const module = useQuery(trpc.modules.bySlug.queryOptions({ slug }));
  const active = useQuery(trpc.sessions.active.queryOptions());
  const markSeen = useMutation(trpc.modules.markContentSeen.mutationOptions({ onSuccess: () => refreshAll() }));
  const firstVisitMarked = useRef<string | null>(null);
  const data = module.data;

  // First visit: remember the current content so "Atualizado" only shows for later changes.
  useEffect(() => {
    if (!data || data.progress.lastSeenContentHash !== null || firstVisitMarked.current === data.id) return;
    firstVisitMarked.current = data.id;
    markSeen.mutate({ moduleId: data.id });
  }, [data]);

  // S and N act on the module on screen.
  useEffect(() => {
    if (!data) return;
    uiActions.setCurrentModule({ id: data.id, slug: data.slug, kicker: data.content.kicker, title: data.title });
    return () => uiActions.setCurrentModule(null);
  }, [data?.id]);

  if (module.isPending) {
    return (
      <main className="mx-auto w-full max-w-page px-4 pt-8 pb-24 sm:px-8">
        <div className="flex max-w-reading flex-col gap-4" role="status" aria-label="Carregando módulo">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-11 w-4/5" />
          <SkeletonLines lines={4} />
        </div>
      </main>
    );
  }

  if (module.isError || !data) {
    return (
      <main className="mx-auto w-full max-w-reading px-4 pt-8 pb-24 sm:px-8">
        {errorCode(module.error) === "NOT_FOUND" ? (
          <EmptyState
            title="Este módulo não existe."
            action={
              <Link href="/modules" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Ver o mapa da trilha
              </Link>
            }
          >
            O endereço pode estar errado, ou o slug do módulo mudou no conteúdo.
          </EmptyState>
        ) : (
          <ErrorState title="O banco local não respondeu." onRetry={() => module.refetch()}>
            {DB_HINT}
          </ErrorState>
        )}
      </main>
    );
  }

  const { content } = data;
  const diff = changedPassages(data.contentChanged ? data.seenContent : null, content);

  return (
    <div className="mx-auto flex w-full max-w-page flex-wrap items-start gap-14 px-4 pt-8 pb-24 sm:px-8">
      <main className="flex min-w-0 max-w-reading flex-[999_1_560px] flex-col gap-11">
        <header className="flex flex-col gap-3">
          <TrailNav module={data} />
          <span className="text-sm text-muted-foreground">{content.kicker}</span>
          <h1 className="font-serif text-3xl font-semibold text-balance sm:text-4xl">{data.title}</h1>
          {content.lead ? (
            <p className="font-serif text-[19px] leading-[1.65]">
              <Changed on={diff.lead}>
                <Markdown inline className="text-[19px] leading-[1.65]">
                  {content.lead}
                </Markdown>
              </Changed>
            </p>
          ) : null}
          {content.prerequisites ? (
            <p className="text-sm text-muted-foreground [&_a]:text-accent">
              <Markdown inline className="text-sm">
                {content.prerequisites}
              </Markdown>
            </p>
          ) : null}
          {data.contentChanged ? (
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm" role="status">
              <span className="rounded-[2px] bg-highlight px-1.5 py-px font-medium text-highlight-ink">
                Atualizado em {formatDayMonth(data.contentUpdatedAt)}
              </span>
              <span className="flex-[1_1_200px] text-muted-foreground">
                {describeChanges(diff)}
                {diff.count > 0 ? " Os trechos mudados aparecem marcados." : ""}
              </span>
              <Button variant="ghost" size="sm" className="min-h-8 text-accent" loading={markSeen.isPending} onClick={() => markSeen.mutate({ moduleId: data.id })}>
                Ok, li
              </Button>
            </div>
          ) : null}
        </header>

        {data.archivedAt ? (
          <Alert tone="warning" title="Módulo arquivado">
            Ele saiu dos arquivos de conteúdo em {formatDate(data.archivedAt)}. Suas notas continuam aqui.
          </Alert>
        ) : null}

        <DecisionQuestions module={data} diff={diff} />
        <WhatIsNew module={data} diff={diff} />
        <Readings module={data} diff={diff} />
        <ExerciseAndSeed module={data} diff={diff} />
      </main>

      <aside aria-label="Meu caderno" className="flex min-w-0 flex-[1_1_300px] flex-col gap-7">
        <MyStep module={data} sessionRunning={Boolean(active.data)} />
        <MyNotes module={data} />
        <MySessions module={data} />
        {/* At step 0 the staircase already offers the session. */}
        {active.data || data.progress.masteryLevel === 0 ? null : <StartHere moduleId={data.id} />}
      </aside>
    </div>
  );
}

function StartHere({ moduleId }: { moduleId: string }) {
  const { start, pending } = useStartSession();
  return (
    <div className="flex flex-col gap-1.5">
      <Button variant="outline" loading={pending} onClick={() => start(moduleId, DEFAULT_SESSION_MINUTES)}>
        <PlayIcon aria-hidden className="fill-current" />
        Iniciar sessão de 25 min
      </Button>
      <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        Atalho <Kbd>S</Kbd> inicia neste módulo
      </span>
    </div>
  );
}

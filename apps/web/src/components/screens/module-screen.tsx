"use client";

import { Alert } from "@estudos-ia/ui/components/alert";
import { Badge } from "@estudos-ia/ui/components/badge";
import { Button, buttonVariants } from "@estudos-ia/ui/components/button";
import { EmptyState } from "@estudos-ia/ui/components/empty-state";
import { ErrorState } from "@estudos-ia/ui/components/error-state";
import { PageHeader, PageShell, Section } from "@estudos-ia/ui/components/page";
import { Prose } from "@estudos-ia/ui/components/prose";
import { Segmented } from "@estudos-ia/ui/components/segmented";
import { Skeleton, SkeletonLines } from "@estudos-ia/ui/components/skeleton";
import { StepSelector } from "@estudos-ia/ui/components/step-ladder";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@estudos-ia/ui/components/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Markdown } from "@/components/markdown";
import { SessionList } from "@/components/session-list";
import { StartSession } from "@/components/start-session";
import { formatDate, formatDayMonth, plural } from "@/lib/format";
import {
  DB_HINT,
  LADDER_DESCRIPTIONS,
  LADDER_LABELS,
  ladderLabel,
  NOTE_TYPES,
  noteTypeLabel,
  type NoteType,
} from "@/lib/labels";
import { routes } from "@/lib/routes";
import { useRefreshAll } from "@/lib/use-refresh";
import { errorCode, useTRPC, type RouterOutputs } from "@/utils/trpc";

type Module = RouterOutputs["modules"]["bySlug"];
type Reading = Module["content"]["readings"][number];

function ReadingItem({ reading }: { reading: Reading }) {
  return (
    <li className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge tone="accent">{reading.kind}</Badge>
        {reading.duration ? <span>{reading.duration}</span> : null}
        {reading.grade ? <Badge>Grau {reading.grade}</Badge> : null}
      </div>
      <p className="font-serif text-lg">
        <Markdown inline>{reading.title}</Markdown>
      </p>
      {reading.why ? <p className="text-sm text-muted-foreground">{reading.why}</p> : null}
    </li>
  );
}

function MarkdownList({ items }: { items: string[] }) {
  return (
    <Prose>
      <ul>
        {items.map((item) => (
          <li key={item}>
            <Markdown inline>{item}</Markdown>
          </li>
        ))}
      </ul>
    </Prose>
  );
}

function ModuleContent({ module }: { module: Module }) {
  const { content } = module;
  const isCases = module.key === "casos";
  const tabs = [
    {
      value: "questions",
      label: isCases ? "Como estudar um caso" : "Perguntas de decisão",
      show: content.decisionQuestions.length > 0,
      panel: (
        <Prose>
          <ul>
            {content.decisionQuestions.map((question) => (
              <li key={question}>
                <Markdown inline>{question}</Markdown>
              </li>
            ))}
          </ul>
        </Prose>
      ),
    },
    {
      value: "readings",
      label: `Leituras (${content.readings.length})`,
      show: content.readings.length > 0,
      panel: (
        <ul className="divide-y divide-line">
          {content.readings.map((reading) => (
            <ReadingItem key={`${reading.url}-${reading.title}`} reading={reading} />
          ))}
        </ul>
      ),
    },
    {
      value: "concepts",
      label: "Já visto e novo",
      show: content.seen.length > 0 || content.new.length > 0,
      panel: (
        <div className="flex flex-col gap-3">
          {content.new.length > 0 ? (
            <details className="rounded-md border border-line bg-surface">
              <summary className="cursor-pointer rounded-md px-4 py-3 font-medium">
                Novo neste módulo ({content.new.length})
              </summary>
              <div className="border-t border-line px-4 py-4">
                <MarkdownList items={content.new} />
              </div>
            </details>
          ) : null}
          {content.seen.length > 0 ? (
            <details className="rounded-md border border-line bg-surface">
              <summary className="cursor-pointer rounded-md px-4 py-3 font-medium">Já visto ({content.seen.length})</summary>
              <div className="border-t border-line px-4 py-4">
                <MarkdownList items={content.seen} />
              </div>
            </details>
          ) : null}
        </div>
      ),
    },
    {
      value: "exercise",
      label: "Exercício",
      show: Boolean(content.exercise),
      panel: <Markdown>{content.exercise ?? ""}</Markdown>,
    },
    {
      value: "seeds",
      label: "Sementes",
      show: Boolean(content.seeds),
      panel: (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {module.part === 1 ? "O que guardar agora para a Parte 2." : "O que este módulo usa da Parte 1."}
          </p>
          <Markdown>{content.seeds ?? ""}</Markdown>
        </div>
      ),
    },
  ].filter((tab) => tab.show);

  if (tabs.length === 0) return null;

  return (
    <Tabs defaultValue={tabs[0]!.value}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTab key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTab>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsPanel key={tab.value} value={tab.value}>
          {tab.panel}
        </TabsPanel>
      ))}
    </Tabs>
  );
}

function Mastery({ module }: { module: Module }) {
  const trpc = useTRPC();
  const refreshAll = useRefreshAll();
  const setMastery = useMutation(
    trpc.modules.setMastery.mutationOptions({
      onSuccess: () => refreshAll(),
      onError: (error) => toast.error("O degrau não foi salvo", { description: error.message }),
    }),
  );
  const level = setMastery.isPending ? setMastery.variables.level : module.progress.masteryLevel;

  return (
    <Section title="Degrau de domínio" aside={<Badge tone={level >= 3 ? "success" : "neutral"}>{ladderLabel(level)}</Badge>}>
      <StepSelector
        level={level}
        labels={LADDER_LABELS}
        descriptions={LADDER_DESCRIPTIONS}
        disabled={setMastery.isPending}
        onLevelChange={(next) => setMastery.mutate({ moduleId: module.id, level: next })}
      />
      <p className="text-sm text-muted-foreground">
        {level === 0
          ? "Marque o degrau quando conseguir fazer o que ele descreve sem olhar a fonte."
          : LADDER_DESCRIPTIONS[level - 1]}
      </p>
    </Section>
  );
}

const NOTE_FILTERS: ReadonlyArray<{ value: NoteType | "all"; label: string }> = [
  { value: "all", label: "Todas" },
  ...NOTE_TYPES.map((type) => ({ value: type.value, label: type.plural })),
];

function Notes({ module }: { module: Module }) {
  const trpc = useTRPC();
  const [filter, setFilter] = useState<NoteType | "all">("all");
  const notes = useQuery(
    trpc.notes.listByModule.queryOptions({ moduleId: module.id, type: filter === "all" ? undefined : filter }),
  );

  return (
    <Section
      title="Notas"
      actions={
        <Link href={routes.newNote(module.slug)} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <PlusIcon />
          Nova nota
        </Link>
      }
    >
      <Segmented label="Filtrar notas por tipo" name="note-filter" value={filter} onValueChange={setFilter} options={NOTE_FILTERS} />
      {notes.isPending ? (
        <SkeletonLines lines={3} />
      ) : notes.isError ? (
        <ErrorState title="Não foi possível carregar as notas." onRetry={() => notes.refetch()}>
          {DB_HINT}
        </ErrorState>
      ) : notes.data.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "Nenhuma nota neste módulo ainda." : "Nenhuma nota deste tipo."}
          action={
            <Link href={routes.newNote(module.slug, { type: filter === "all" ? "summary" : filter })} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Escrever a primeira
            </Link>
          }
        >
          Feche a fonte e escreva com suas palavras: o que você escreve fica, o que copia não.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line bg-surface">
          {notes.data.map((note) => (
            <li key={note.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
              <Link href={routes.note(note.id)} className="min-w-0 flex-1 font-serif text-lg underline-offset-[3px] hover:underline">
                {note.title}
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge tone="accent">{noteTypeLabel(note.type)}</Badge>
                {note.evidenceGrade ? <Badge>Grau {note.evidenceGrade}</Badge> : null}
                {note.source === "html_import" ? <Badge>importada</Badge> : null}
                <span>{formatDate(note.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Sessions({ module }: { module: Module }) {
  const trpc = useTRPC();
  const sessions = useQuery(trpc.sessions.list.queryOptions({ moduleId: module.id, limit: 20 }));

  return (
    <Section
      title="Sessões"
      aside={sessions.data && sessions.data.length > 0 ? <Badge>{plural(sessions.data.length, "sessão", "sessões")}</Badge> : null}
    >
      <StartSession moduleId={module.id} />
      {sessions.isPending ? (
        <SkeletonLines lines={2} />
      ) : sessions.isError ? (
        <ErrorState title="Não foi possível carregar as sessões." onRetry={() => sessions.refetch()}>
          {DB_HINT}
        </ErrorState>
      ) : sessions.data.length === 0 ? (
        <EmptyState title="Nenhuma sessão neste módulo ainda.">
          Escolha a duração acima e inicie. Ao fim, o app pede um resumo com suas palavras em até 24 h.
        </EmptyState>
      ) : (
        <SessionList sessions={sessions.data} showModule={false} />
      )}
    </Section>
  );
}

export function ModuleScreen({ slug }: { slug: string }) {
  const trpc = useTRPC();
  const refreshAll = useRefreshAll();
  const module = useQuery(trpc.modules.bySlug.queryOptions({ slug }));
  const markSeen = useMutation(trpc.modules.markContentSeen.mutationOptions({ onSuccess: () => refreshAll() }));
  const firstVisitMarked = useRef<string | null>(null);

  // First visit: remember the current content so "conteúdo atualizado" only shows for later changes.
  useEffect(() => {
    const data = module.data;
    if (!data || data.progress.lastSeenContentHash !== null || firstVisitMarked.current === data.id) return;
    firstVisitMarked.current = data.id;
    markSeen.mutate({ moduleId: data.id });
  }, [module.data]);

  if (module.isPending) {
    return (
      <PageShell width="reading">
        <div className="flex flex-col gap-4" role="status" aria-label="Carregando módulo">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-4/5" />
          <SkeletonLines lines={4} />
        </div>
      </PageShell>
    );
  }

  if (module.isError) {
    return (
      <PageShell width="reading">
        {errorCode(module.error) === "NOT_FOUND" ? (
          <EmptyState
            title="Este módulo não existe."
            action={
              <Link href="/modules" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Ver todos os módulos
              </Link>
            }
          >
            O endereço pode estar errado, ou o slug do módulo mudou no conteúdo.
          </EmptyState>
        ) : (
          <ErrorState title="Não foi possível carregar o módulo." onRetry={() => module.refetch()}>
            {DB_HINT}
          </ErrorState>
        )}
      </PageShell>
    );
  }

  const data = module.data;
  const { content } = data;

  return (
    <PageShell width="reading">
      <PageHeader
        kicker={content.kicker}
        title={data.title}
        description={
          <>
            {content.lead ? <Markdown inline>{content.lead}</Markdown> : null}
            {content.prerequisites ? (
              <p className="mt-3 font-sans text-sm">
                <Markdown inline>{content.prerequisites}</Markdown>
              </p>
            ) : null}
          </>
        }
      />

      {data.archivedAt ? (
        <Alert tone="warning" title="Módulo arquivado">
          Ele saiu dos arquivos de conteúdo em {formatDate(data.archivedAt)}. Suas notas continuam aqui.
        </Alert>
      ) : null}

      {data.contentChanged ? (
        <Alert
          tone="highlight"
          title={`Conteúdo atualizado em ${formatDayMonth(data.contentUpdatedAt)}`}
          actions={
            <Button variant="outline" size="sm" loading={markSeen.isPending} onClick={() => markSeen.mutate({ moduleId: data.id })}>
              Ok
            </Button>
          }
        >
          O texto deste módulo mudou desde a sua última visita. Vale reler antes de revisar as notas.
        </Alert>
      ) : null}

      <ModuleContent module={data} />
      <Mastery module={data} />
      <Notes module={data} />
      <Sessions module={data} />
    </PageShell>
  );
}

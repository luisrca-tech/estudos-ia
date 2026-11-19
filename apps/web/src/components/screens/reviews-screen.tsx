"use client";

import { Alert } from "@estudos-ia/ui/components/alert";
import { Badge } from "@estudos-ia/ui/components/badge";
import { Button, buttonVariants } from "@estudos-ia/ui/components/button";
import { EmptyState } from "@estudos-ia/ui/components/empty-state";
import { ErrorState } from "@estudos-ia/ui/components/error-state";
import { PageHeader, PageShell } from "@estudos-ia/ui/components/page";
import { ReviewCard } from "@estudos-ia/ui/components/review-card";
import { Skeleton, SkeletonLines } from "@estudos-ia/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Markdown } from "@/components/markdown";
import { formatDayMonth } from "@/lib/format";
import { DB_HINT, noteTypeLabel } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { useRefreshAll } from "@/lib/use-refresh";
import { useTRPC, type RouterOutputs } from "@/utils/trpc";

type DueReview = RouterOutputs["reviews"]["due"][number];

/** Reviews 1 to 4 happen 1, 3, 7 and 21 days after the note was written. */
const STEP_LABELS = ["revisão de 1 dia", "revisão de 3 dias", "revisão de 7 dias", "revisão de 21 dias"];

function RevealedNote({ noteId, prompt }: { noteId: string; prompt: string }) {
  const trpc = useTRPC();
  const note = useQuery(trpc.reviews.reveal.queryOptions({ noteId }, { staleTime: Number.POSITIVE_INFINITY }));

  if (note.isPending) return <SkeletonLines lines={4} />;
  if (note.isError) {
    return (
      <ErrorState title="Não foi possível abrir a nota." onRetry={() => note.refetch()}>
        {DB_HINT}
      </ErrorState>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* A question note already shows its title as the prompt. */}
        {note.data.title === prompt ? null : <h2 className="font-serif text-xl font-semibold">{note.data.title}</h2>}
        {note.data.evidenceGrade ? <Badge>Grau {note.data.evidenceGrade}</Badge> : null}
      </div>
      <Markdown>{note.data.body}</Markdown>
      <div className="flex flex-wrap gap-4 text-sm">
        {note.data.sourceUrl ? (
          <a href={note.data.sourceUrl} target="_blank" rel="noreferrer noopener" className={buttonVariants({ variant: "link", size: "sm" })}>
            Abrir a fonte
          </a>
        ) : null}
        <Link href={routes.note(note.data.noteId)} className={buttonVariants({ variant: "link", size: "sm" })}>
          Editar nota
        </Link>
      </div>
    </div>
  );
}

export function ReviewsScreen() {
  const trpc = useTRPC();
  const refreshAll = useRefreshAll();
  const due = useQuery(trpc.reviews.due.queryOptions(undefined, { staleTime: Number.POSITIVE_INFINITY, refetchOnWindowFocus: false }));

  // The queue is fixed when the round starts, so grading never reshuffles what comes next.
  const [queue, setQueue] = useState<DueReview[] | null>(null);
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const revealButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (queue === null && due.data) setQueue(due.data);
  }, [due.data, queue]);

  useEffect(() => {
    revealButton.current?.focus();
  }, [position]);

  const grade = useMutation(
    trpc.reviews.grade.mutationOptions({
      onSuccess: () => {
        setRevealed(false);
        setPosition((current) => current + 1);
        return refreshAll();
      },
      onError: (error) => toast.error("A revisão não foi registrada", { description: error.message }),
    }),
  );

  if (due.isError) {
    return (
      <PageShell width="reading">
        <PageHeader title="Revisões" />
        <ErrorState title="Não foi possível carregar as revisões de hoje." onRetry={() => due.refetch()}>
          {DB_HINT}
        </ErrorState>
      </PageShell>
    );
  }

  if (queue === null) {
    return (
      <PageShell width="reading">
        <PageHeader title="Revisões" />
        <div role="status" aria-label="Carregando revisões">
          <Skeleton className="h-64 rounded-md" />
        </div>
      </PageShell>
    );
  }

  const current = queue[position];

  if (!current) {
    return (
      <PageShell width="reading">
        <PageHeader title="Revisões" />
        {queue.length === 0 ? (
          <EmptyState
            title="Nenhuma revisão para hoje."
            action={
              <Link href="/modules" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Ir para os módulos
              </Link>
            }
          >
            Cada nota que você escreve volta aqui em 1, 3, 7 e 21 dias. Escreva uma nota hoje e ela aparece amanhã.
          </EmptyState>
        ) : (
          <Alert
            tone="success"
            title="Revisões de hoje concluídas."
            actions={
              <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Voltar para Hoje
              </Link>
            }
          >
            Você passou por {queue.length === 1 ? "1 nota" : `${queue.length} notas`}. O que não lembrou volta amanhã.
          </Alert>
        )}
      </PageShell>
    );
  }

  return (
    <PageShell width="reading" className="gap-6">
      <PageHeader
        title="Revisões"
        description={<span className="font-sans text-base">Responda de cabeça antes de revelar. Tentar lembrar fixa mais do que reler.</span>}
      />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium" aria-live="polite">
          {position + 1} de {queue.length}
        </p>
        <div className="flex gap-1" aria-hidden>
          {queue.map((item, index) => (
            <span
              key={item.noteId}
              className={`h-1.5 flex-1 rounded-full ${index < position ? "bg-accent" : index === position ? "bg-accent/45" : "bg-line-strong/50"}`}
            />
          ))}
        </div>
      </div>

      <ReviewCard
        key={current.noteId}
        context={
          <Link href={routes.module(current.moduleSlug)} className="underline-offset-[3px] hover:underline">
            {current.moduleKicker}
          </Link>
        }
        meta={
          <>
            <Badge tone="accent">{noteTypeLabel(current.noteType)}</Badge>
            <Badge>{STEP_LABELS[current.step] ?? `passo ${current.step + 1}`}</Badge>
            {current.overdue ? <Badge tone="danger">atrasada desde {formatDayMonth(`${current.dueOn}T12:00:00-03:00`)}</Badge> : null}
          </>
        }
        prompt={current.prompt}
        revealed={revealed}
        answer={revealed ? <RevealedNote noteId={current.noteId} prompt={current.prompt} /> : null}
        actions={
          revealed ? (
            <>
              <Button loading={grade.isPending && grade.variables.result === "recalled"} disabled={grade.isPending} onClick={() => grade.mutate({ noteId: current.noteId, result: "recalled" })}>
                Lembrei
              </Button>
              <Button variant="outline" loading={grade.isPending && grade.variables.result === "forgot"} disabled={grade.isPending} onClick={() => grade.mutate({ noteId: current.noteId, result: "forgot" })}>
                Não lembrei
              </Button>
              <span className="text-sm text-muted-foreground">Não lembrei volta amanhã.</span>
            </>
          ) : (
            <>
              <Button ref={revealButton} onClick={() => setRevealed(true)}>
                Revelar
              </Button>
              <span className="text-sm text-muted-foreground">Responda em voz alta ou no papel primeiro.</span>
            </>
          )
        }
      />
    </PageShell>
  );
}

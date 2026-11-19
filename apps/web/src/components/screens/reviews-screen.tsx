"use client";

import { Alert } from "@estudos-ia/ui/components/alert";
import { Button, buttonVariants, Kbd } from "@estudos-ia/ui/components/button";
import { EmptyState } from "@estudos-ia/ui/components/empty-state";
import { ErrorState } from "@estudos-ia/ui/components/error-state";
import { controlClassName } from "@estudos-ia/ui/components/input";
import { Skeleton, SkeletonLines } from "@estudos-ia/ui/components/skeleton";
import { cn } from "@estudos-ia/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Markdown } from "@/components/markdown";
import { formatDayMonth } from "@/lib/format";
import { DB_HINT, noteTypeLabel } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { reviewKeyFor } from "@/lib/shortcuts";
import { nextReviewLabel, overdueLabel } from "@/lib/study-labels";
import { useRefreshAll } from "@/lib/use-refresh";
import { useTRPC, type RouterOutputs } from "@/utils/trpc";

type DueReview = RouterOutputs["reviews"]["due"][number];
type Result = "recalled" | "forgot";

/** Reviews 1 to 4 happen 1, 3, 7 and 21 days after the note was written. */
const STEP_LABELS = ["revisão de 1 dia", "revisão de 3 dias", "revisão de 7 dias", "revisão de 21 dias"];

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex w-full max-w-focus flex-col gap-7 px-4 pt-8 pb-24 sm:px-8 sm:pt-10">{children}</main>;
}

function Heading() {
  return <h1 className="font-serif text-3xl font-semibold">Revisões</h1>;
}

/** Answer and note side by side once revealed (board Revisoes-revelada). */
function Revealed({ noteId, answer }: { noteId: string; answer: string }) {
  const trpc = useTRPC();
  const note = useQuery(trpc.reviews.reveal.queryOptions({ noteId }, { staleTime: Number.POSITIVE_INFINITY }));

  if (note.isPending) return <SkeletonLines lines={4} />;
  if (note.isError) {
    return (
      <ErrorState title="O banco local não respondeu." onRetry={() => note.refetch()}>
        {DB_HINT}
      </ErrorState>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        {answer.trim() ? (
          <div className="flex flex-col gap-1.5 rounded-lg bg-surface-sunken p-4">
            <span className="text-xs font-medium text-muted-foreground">Você respondeu</span>
            <p className="font-serif leading-[1.65] whitespace-pre-wrap">{answer.trim()}</p>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-line bg-surface p-4">
          <span className="text-xs font-medium text-muted-foreground">
            Sua nota{note.data.evidenceGrade ? ` · grau ${note.data.evidenceGrade}` : ""}
          </span>
          <Markdown>{note.data.body}</Markdown>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <Link href={routes.note(note.data.noteId)} className="text-sm text-accent">
          Abrir nota completa
        </Link>
        {note.data.sourceUrl ? (
          <a href={note.data.sourceUrl} target="_blank" rel="noreferrer noopener" className="text-sm text-accent">
            Abrir a fonte
          </a>
        ) : null}
      </div>
    </div>
  );
}

function GradeButton({
  result,
  hint,
  shortcut,
  pending,
  disabled,
  onClick,
}: {
  result: Result;
  hint: string;
  shortcut: string;
  pending: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const primary = result === "recalled";
  return (
    <Button
      variant={primary ? "primary" : "outline"}
      loading={pending}
      disabled={disabled}
      onClick={onClick}
      aria-keyshortcuts={shortcut}
      className="min-h-16 flex-[1_1_200px] justify-between px-[18px] py-2 text-base"
    >
      <span className="flex flex-col items-start">
        <span>{primary ? "Lembrei" : "Não lembrei"}</span>
        <span className={cn("text-[13px] font-normal", primary ? "opacity-85" : "text-muted-foreground")}>{hint}</span>
      </span>
      <Kbd inverted={primary}>{shortcut}</Kbd>
    </Button>
  );
}

export function ReviewsScreen() {
  const trpc = useTRPC();
  const refreshAll = useRefreshAll();
  const due = useQuery(trpc.reviews.due.queryOptions(undefined, { staleTime: Number.POSITIVE_INFINITY, refetchOnWindowFocus: false }));

  // The queue is fixed when the round starts, so grading never reshuffles what comes next.
  const [queue, setQueue] = useState<DueReview[] | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [revealed, setRevealed] = useState(false);
  // Client only: the answer helps the comparison and is never saved.
  const [answer, setAnswer] = useState("");
  const revealButton = useRef<HTMLButtonElement>(null);
  const position = results.length;

  useEffect(() => {
    if (queue === null && due.data) setQueue(due.data);
  }, [due.data, queue]);

  const grade = useMutation(
    trpc.reviews.grade.mutationOptions({
      onSuccess: (_, variables) => {
        setRevealed(false);
        setAnswer("");
        setResults((current) => [...current, variables.result]);
        return refreshAll();
      },
      onError: (error) => toast.error("A revisão não foi registrada", { description: error.message }),
    }),
  );

  const current = queue?.[position];

  useEffect(() => {
    if (!current) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const action = reviewKeyFor(event, revealed);
      if (!action) return;
      event.preventDefault();
      if (action === "reveal") setRevealed(true);
      else if (!grade.isPending) grade.mutate({ noteId: current.noteId, result: action });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, revealed, grade]);

  if (due.isError) {
    return (
      <Shell>
        <Heading />
        <ErrorState title="O banco local não respondeu." onRetry={() => due.refetch()}>
          {DB_HINT}
        </ErrorState>
      </Shell>
    );
  }

  if (queue === null) {
    return (
      <Shell>
        <div role="status" aria-label="Carregando revisões" className="flex flex-col gap-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </div>
      </Shell>
    );
  }

  const recalled = results.filter((result) => result === "recalled").length;

  if (!current) {
    return (
      <Shell>
        <Heading />
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
            {recalled} de {queue.length} lembradas. O que não lembrou volta amanhã.
          </Alert>
        )}
      </Shell>
    );
  }

  const overdue = overdueLabel(current.dueOn, new Date());

  return (
    <Shell>
      <h1 className="sr-only">Revisões</h1>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm" aria-live="polite">
            <span className="font-mono font-medium">
              {position + 1} de {queue.length}
            </span>
            <span className="text-muted-foreground">
              {" "}
              · {recalled} {recalled === 1 ? "lembrada" : "lembradas"}
            </span>
          </span>
          <Link href="/" className="inline-flex min-h-8 items-center text-sm text-muted-foreground">
            Parar por hoje
          </Link>
        </div>
        <div
          role="progressbar"
          aria-label="Revisões feitas"
          aria-valuemin={0}
          aria-valuemax={queue.length}
          aria-valuenow={position}
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${queue.length}, minmax(0, 1fr))` }}
        >
          {queue.map((item, index) => (
            <span
              key={item.noteId}
              className={cn(
                "h-1 rounded-[1px]",
                index === position
                  ? "bg-accent"
                  : results[index] === "recalled"
                    ? "bg-success"
                    : results[index] === "forgot"
                      ? "bg-line-strong"
                      : "bg-surface-sunken",
              )}
            />
          ))}
        </div>
      </div>

      <article key={current.noteId} className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground">
          <Link href={routes.module(current.moduleSlug)} className="text-muted-foreground no-underline hover:underline">
            {current.moduleKicker}
          </Link>
          <span aria-hidden>·</span>
          <span>
            {noteTypeLabel(current.noteType)} de {formatDayMonth(current.noteCreatedAt)}
          </span>
          <span aria-hidden>·</span>
          <span>{STEP_LABELS[current.step] ?? `revisão ${current.step + 1}`}</span>
          {overdue ? (
            <span className="inline-flex h-5 items-center rounded-full bg-danger-soft px-[7px] text-xs font-medium text-danger">{overdue}</span>
          ) : null}
        </div>
        <h2 className="font-serif text-[1.625rem] leading-[1.3] font-semibold text-balance sm:text-[1.875rem]">{current.prompt}</h2>

        {revealed ? (
          <div className="flex flex-col gap-5">
            <Revealed noteId={current.noteId} answer={answer} />
            <div className="flex flex-wrap gap-3 border-t border-line pt-4">
              <GradeButton
                result="forgot"
                hint="volta amanhã"
                shortcut="1"
                pending={grade.isPending && grade.variables.result === "forgot"}
                disabled={grade.isPending}
                onClick={() => grade.mutate({ noteId: current.noteId, result: "forgot" })}
              />
              <GradeButton
                result="recalled"
                hint={nextReviewLabel(current.step)}
                shortcut="2"
                pending={grade.isPending && grade.variables.result === "recalled"}
                disabled={grade.isPending}
                onClick={() => grade.mutate({ noteId: current.noteId, result: "recalled" })}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="review-answer" className="text-sm font-medium">
                Sua resposta, de cabeça <span className="font-normal text-muted-foreground">(opcional, não é salva)</span>
              </label>
              <textarea
                id="review-answer"
                rows={4}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                className={cn(controlClassName, "resize-y px-3.5 py-3 font-serif leading-[1.6]")}
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button ref={revealButton} size="lg" onClick={() => setRevealed(true)} aria-keyshortcuts="Space">
                Revelar nota
                <Kbd inverted className="text-[11px]">
                  Espaço
                </Kbd>
              </Button>
              <span className="text-sm text-muted-foreground">Reconhecer não é lembrar. Tente antes.</span>
            </div>
          </div>
        )}
      </article>
    </Shell>
  );
}

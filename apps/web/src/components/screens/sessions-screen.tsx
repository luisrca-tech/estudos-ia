"use client";

import { Button, buttonVariants } from "@estudos-ia/ui/components/button";
import { EmptyState } from "@estudos-ia/ui/components/empty-state";
import { ErrorState } from "@estudos-ia/ui/components/error-state";
import { Skeleton } from "@estudos-ia/ui/components/skeleton";
import { cn } from "@estudos-ia/ui/lib/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { formatDuration, formatTime, moduleLabel, plural } from "@/lib/format";
import { DB_HINT } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { focusLabel, groupSessionsByDay, needsSummary, weekSummary } from "@/lib/session-groups";
import { useTRPC, type RouterOutputs } from "@/utils/trpc";

type Session = RouterOutputs["sessions"]["list"][number];
type Filter = "all" | "missing";

const PAGE = 50;
const MAX = 200;

const BADGE = {
  accent: "bg-accent-soft text-accent",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  success: "bg-success-soft text-success",
  muted: "bg-surface-sunken text-muted-foreground",
} as const;

/** Summary column: badge text, tone and the row action (board Sessoes). */
function summaryCell(session: Session): { label: string; tone: keyof typeof BADGE; action?: { label: string; href: ReturnType<typeof routes.note> } } {
  if (session.status === "running") return { label: "Em andamento", tone: "accent" };
  if (session.status === "cancelled") return { label: "Cancelada", tone: "muted" };
  const write = { label: "Escrever resumo", href: routes.newNote(session.module.slug, { type: "summary", sessionId: session.id }) };
  switch (session.summary.state) {
    case "pending":
      return { label: `Faltam ${session.summary.hours} h`, tone: "warning", action: write };
    case "overdue":
      return { label: "Atrasado", tone: "danger", action: write };
    case "covered":
      return {
        label: "Escrito",
        tone: "success",
        action: { label: "Ver resumo", href: session.summaryNoteId ? routes.note(session.summaryNoteId) : routes.module(session.module.slug) },
      };
    default:
      // Under the 5-minute minimum: no summary is asked for.
      return { label: "Curta, sem cobrança", tone: "muted" };
  }
}

function SessionRow({ session, now }: { session: Session; now: Date }) {
  const focus = focusLabel(session, now);
  const cell = summaryCell(session);
  const cancelled = session.status === "cancelled";
  return (
    <tr className={cn("border-t border-line", cancelled ? "text-muted-foreground" : "text-foreground")}>
      <td className="px-4 py-3 font-mono">{formatTime(session.startedAt)}</td>
      <td className="px-4 py-3">
        <Link href={routes.module(session.module.slug)} className="text-inherit no-underline hover:underline">
          {moduleLabel(session.module.kicker, session.module.title)}
        </Link>
      </td>
      <td className="px-4 py-3">
        <span className="flex flex-col gap-1">
          <span className="font-mono whitespace-nowrap">{focus.text}</span>
          <span aria-hidden className="h-[3px] w-20 overflow-hidden rounded-[2px] bg-surface-sunken">
            <span className={cn("block h-[3px]", cancelled ? "bg-line-strong" : "bg-accent")} style={{ width: `${focus.ratio * 100}%` }} />
          </span>
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={cn("inline-flex h-[22px] items-center rounded-full px-2 text-xs font-medium whitespace-nowrap", BADGE[cell.tone])}>{cell.label}</span>
      </td>
      <td className="px-4 py-3 text-right">
        {cell.action ? (
          <Link href={cell.action.href} className="inline-flex min-h-8 items-center font-medium text-accent">
            {cell.action.label}
          </Link>
        ) : null}
      </td>
    </tr>
  );
}

export function SessionsScreen() {
  const trpc = useTRPC();
  const [limit, setLimit] = useState(PAGE);
  const [filter, setFilter] = useState<Filter>("all");
  const sessions = useQuery({ ...trpc.sessions.list.queryOptions({ limit }), placeholderData: keepPreviousData });
  const now = new Date();

  const all = sessions.data ?? [];
  const missing = all.filter(needsSummary);
  const shown = filter === "missing" ? missing : all;
  const week = weekSummary(all, now);

  return (
    <main className="mx-auto flex w-full max-w-page flex-col gap-7 px-4 pt-8 pb-24 sm:px-8 sm:pt-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-3xl font-semibold sm:text-[2.375rem] sm:leading-[1.15]">Sessões</h1>
          {sessions.data ? (
            <p className="text-muted-foreground">
              Esta semana: {plural(week.completed, "sessão concluída", "sessões concluídas")}
              {week.focusSeconds >= 60 ? `, ${formatDuration(week.focusSeconds)} de foco` : ""}.
            </p>
          ) : null}
        </div>
        <div role="radiogroup" aria-label="Filtro" className="inline-flex gap-0.5 rounded-[6px] bg-surface-sunken p-[3px]">
          {(["all", "missing"] as const).map((value) => {
            const on = filter === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setFilter(value)}
                className={cn(
                  "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-sm border px-3 text-sm",
                  on ? "border-line bg-surface font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "all" ? "Todas" : "Sem resumo"}
                {value === "missing" && missing.length > 0 ? (
                  <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-soft px-[5px] text-[11px] font-semibold text-danger">
                    {missing.length}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </header>

      {sessions.isPending ? (
        <div role="status" aria-label="Carregando sessões" className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      ) : sessions.isError ? (
        <ErrorState title="O banco local não respondeu." onRetry={() => sessions.refetch()}>
          {DB_HINT}
        </ErrorState>
      ) : all.length === 0 ? (
        <EmptyState
          title="Nenhuma sessão registrada ainda."
          action={
            <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Ir para Hoje
            </Link>
          }
        >
          Inicie uma sessão em Hoje ou na página de um módulo. Ela aparece aqui com o foco e o resumo.
        </EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState title="Tudo resumido.">Nenhuma sessão concluída espera resumo agora.</EmptyState>
      ) : (
        <>
          <div className="relative overflow-x-auto rounded-lg border border-line bg-surface" tabIndex={0} aria-label="Tabela de sessões">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th scope="col" className="w-20 px-4 py-3 font-medium">
                    Início
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Módulo
                  </th>
                  <th scope="col" className="w-[7.5rem] px-4 py-3 font-medium">
                    Foco
                  </th>
                  <th scope="col" className="w-[11.875rem] px-4 py-3 font-medium">
                    Resumo
                  </th>
                  <th scope="col" className="w-[8.75rem] px-4 py-3 font-medium">
                    <span className="sr-only">Ação</span>
                  </th>
                </tr>
              </thead>
              {groupSessionsByDay(shown, now).map((group) => (
                <tbody key={group.day}>
                  <tr>
                    <th scope="rowgroup" colSpan={5} className="border-t border-line bg-background px-4 pt-2.5 pb-1.5 text-left font-serif text-[15px] font-semibold">
                      {group.label}
                    </th>
                  </tr>
                  {group.sessions.map((session) => (
                    <SessionRow key={session.id} session={session} now={now} />
                  ))}
                </tbody>
              ))}
            </table>
          </div>
          {all.length >= limit && limit < MAX ? (
            <Button variant="outline" className="self-center" loading={sessions.isFetching} onClick={() => setLimit((value) => Math.min(MAX, value + PAGE))}>
              Carregar semanas anteriores
            </Button>
          ) : null}
        </>
      )}
    </main>
  );
}

"use client";

import { EmptyState } from "@estudos-ia/ui/components/empty-state";
import { ErrorState } from "@estudos-ia/ui/components/error-state";
import { Skeleton } from "@estudos-ia/ui/components/skeleton";
import { cn } from "@estudos-ia/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { formatLastSession, plural } from "@/lib/format";
import { DB_HINT, LADDER_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { degreeCells, goalProgress, type DegreeCell } from "@/lib/study-labels";
import { useTRPC, type RouterOutputs } from "@/utils/trpc";

type ModuleSummary = RouterOutputs["modules"]["list"][number];

const CELL_COLOR: Record<DegreeCell, string> = { accent: "bg-accent", success: "bg-success", empty: "bg-surface-sunken" };

/** "5" for "Módulo 5 · …", "◆" for sections without a number. */
function moduleNumber(kicker: string): string {
  return kicker.match(/^Módulo (\d+)/)?.[1] ?? "◆";
}

/** The part of the kicker after the number: "Como o modelo age". */
function kickerTopic(kicker: string): string {
  return kicker.includes(" · ") ? kicker.split(" · ").slice(1).join(" · ") : kicker;
}

function DegreeBar({ level }: { level: number }) {
  return (
    <span className="flex w-[8.25rem] flex-col gap-1">
      <span role="img" aria-label={`Degrau ${level} de 5`} className="grid grid-cols-5 gap-[3px]">
        {degreeCells(level).map((cell, index) => (
          <span key={index} className={cn("h-2 rounded-[1px]", CELL_COLOR[cell])} />
        ))}
      </span>
      <span className={cn("text-xs", level >= 3 ? "text-success" : level === 0 ? "text-muted-foreground" : "text-foreground")}>
        {level === 0 ? "Não comecei" : `${level} · ${LADDER_LABELS[level - 1]}`}
      </span>
    </span>
  );
}

function MapRow({ module, current, now }: { module: ModuleSummary; current: boolean; now: Date }) {
  return (
    <Link
      href={routes.module(module.slug)}
      aria-current={current ? "true" : undefined}
      className={cn(
        "flex min-h-16 flex-wrap items-center gap-x-6 gap-y-2 border-b border-line py-2.5 text-foreground no-underline transition-colors duration-150 hover:bg-surface",
        current && "bg-[color-mix(in_srgb,var(--accent-soft)_45%,transparent)]",
      )}
    >
      <div className="flex min-w-0 flex-[1_1_320px] items-baseline gap-4">
        <span className="w-7 flex-none text-right font-mono text-[13px] text-muted-foreground">{moduleNumber(module.kicker)}</span>
        <span className="flex min-w-0 flex-col">
          <span className="font-serif text-[17px] leading-[1.35] font-semibold">
            {module.title}
            {module.contentChanged ? (
              <span className="ml-2 inline-flex h-5 items-center rounded-full bg-highlight px-[7px] align-[2px] font-sans text-[11px] font-medium text-highlight-ink">
                Atualizado
              </span>
            ) : null}
          </span>
          <span className="text-[13px] text-muted-foreground">
            {current ? "Sessão em andamento · " : ""}
            {kickerTopic(module.kicker)}
          </span>
        </span>
      </div>
      <div className="ml-11 flex flex-wrap items-center gap-x-6 gap-y-1 sm:ml-0">
        <DegreeBar level={module.masteryLevel} />
        <span className={cn("w-16 text-right font-mono text-sm", module.noteCount === 0 ? "text-muted-foreground" : "text-foreground")}>
          <span className="sr-only">Notas: </span>
          {module.noteCount}
        </span>
        <span className="w-[7.5rem] text-right text-sm text-muted-foreground">
          <span className="sr-only">Última sessão: </span>
          {formatLastSession(module.lastSessionAt, now)}
        </span>
        <ChevronRightIcon aria-hidden className="size-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

function PartSection({ name, modules, currentId, now }: { name: string; modules: ModuleSummary[]; currentId?: string; now: Date }) {
  return (
    <section className="flex flex-col">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-line-strong pb-2">
        <h2 className="flex-[1_1_200px] font-serif text-[22px] font-semibold">{name}</h2>
        <span aria-hidden className="hidden w-[8.25rem] text-xs text-muted-foreground sm:block">
          Degrau
        </span>
        <span aria-hidden className="hidden w-16 text-right text-xs text-muted-foreground sm:block">
          Notas
        </span>
        <span aria-hidden className="hidden w-[7.5rem] text-right text-xs text-muted-foreground sm:block">
          Última sessão
        </span>
        <span aria-hidden className="hidden w-4 sm:block" />
      </div>
      {modules.map((module) => (
        <MapRow key={module.id} module={module} current={module.id === currentId} now={now} />
      ))}
    </section>
  );
}

export function ModulesScreen() {
  const trpc = useTRPC();
  const modules = useQuery(trpc.modules.list.queryOptions({ includeArchived: true }));
  const active = useQuery(trpc.sessions.active.queryOptions());
  const [showArchived, setShowArchived] = useState(false);
  const now = new Date();

  const current = modules.data?.filter((module) => module.archivedAt === null) ?? [];
  const archived = modules.data?.filter((module) => module.archivedAt !== null) ?? [];
  const progress = goalProgress(current.map((module) => module.masteryLevel));
  const goalCells = [...current]
    .sort((a, b) => b.masteryLevel - a.masteryLevel)
    .map((module) => (module.masteryLevel >= 3 ? "bg-success" : module.masteryLevel > 0 ? "bg-line-strong" : "bg-surface-sunken"));

  return (
    <main className="mx-auto flex w-full max-w-page flex-col gap-10 px-4 pt-8 pb-24 sm:px-8 sm:pt-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Mapa da trilha</h1>
          <p className="text-muted-foreground">Meta: degrau 3 em todos e degrau 4 em dois ou três, nos seus projetos.</p>
        </div>
        {current.length > 0 ? (
          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:flex-[0_1_360px]">
            <div className="flex justify-between gap-4 text-[13px]">
              <span className="font-medium">
                {progress.atGoal} de {progress.total} no degrau 3
              </span>
              <span className="text-muted-foreground">{progress.atFour} no degrau 4</span>
            </div>
            <div
              role="img"
              aria-label={`${progress.atGoal} de ${progress.total} módulos no degrau 3 ou acima`}
              className="grid gap-0.5"
              style={{ gridTemplateColumns: `repeat(${goalCells.length}, minmax(0, 1fr))` }}
            >
              {goalCells.map((color, index) => (
                <span key={index} className={cn("h-2 rounded-[1px]", color)} />
              ))}
            </div>
          </div>
        ) : null}
      </header>

      {modules.isPending ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Carregando módulos">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-14" />
          ))}
        </div>
      ) : modules.isError ? (
        <ErrorState title="O banco local não respondeu." onRetry={() => modules.refetch()}>
          {DB_HINT}
        </ErrorState>
      ) : current.length === 0 && archived.length === 0 ? (
        <EmptyState title="Nenhum módulo no banco.">
          Rode <code className="font-mono">npm run db:seed</code> para carregar os módulos de content/modules.
        </EmptyState>
      ) : (
        <>
          {[1, 2].map((part) => {
            const inPart = current.filter((module) => module.part === part);
            return inPart.length > 0 ? (
              <PartSection key={part} name={`Parte ${part}`} modules={inPart} currentId={active.data?.module.id} now={now} />
            ) : null;
          })}

          {archived.length > 0 ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                aria-expanded={showArchived}
                onClick={() => setShowArchived((value) => !value)}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 self-start text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronDownIcon aria-hidden className={cn("size-4 transition-transform duration-150", !showArchived && "-rotate-90")} />
                {plural(archived.length, "módulo arquivado", "módulos arquivados")}
              </button>
              {showArchived ? (
                <>
                  <p className="text-sm text-muted-foreground">Saíram dos arquivos de conteúdo. As notas continuam aqui.</p>
                  <PartSection name="Arquivados" modules={archived} now={now} />
                </>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}

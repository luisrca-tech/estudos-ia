"use client";

import { Badge } from "@estudos-ia/ui/components/badge";
import { Card } from "@estudos-ia/ui/components/card";
import { EmptyState } from "@estudos-ia/ui/components/empty-state";
import { ErrorState } from "@estudos-ia/ui/components/error-state";
import { PageHeader, PageShell, Section } from "@estudos-ia/ui/components/page";
import { Skeleton } from "@estudos-ia/ui/components/skeleton";
import { StepLadder } from "@estudos-ia/ui/components/step-ladder";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { plural } from "@/lib/format";
import { DB_HINT, ladderLabel } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { useTRPC, type RouterOutputs } from "@/utils/trpc";

type ModuleSummary = RouterOutputs["modules"]["list"][number];

function ModuleCard({ module }: { module: ModuleSummary }) {
  return (
    <Card variant="interactive" padding="sm" className="relative flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{module.kicker}</p>
        {module.contentChanged ? <Badge tone="highlight">conteúdo atualizado</Badge> : null}
      </div>
      <h3 className="font-serif text-xl font-semibold">
        <Link href={routes.module(module.slug)} className="outline-none after:absolute after:inset-0 after:rounded-md">
          {module.title}
        </Link>
      </h3>
      <div className="mt-auto flex flex-wrap items-end gap-x-4 gap-y-1 pt-2 text-sm text-muted-foreground">
        <span className="flex items-end gap-2">
          <StepLadder level={module.masteryLevel} label={ladderLabel(module.masteryLevel)} />
          {module.masteryLevel === 0 ? "Degrau 0" : `Degrau ${module.masteryLevel}`}
        </span>
        <span>{plural(module.noteCount, "nota", "notas")}</span>
      </div>
    </Card>
  );
}

function ModuleGrid({ modules }: { modules: ModuleSummary[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {modules.map((module) => (
        <li key={module.id}>
          <ModuleCard module={module} />
        </li>
      ))}
    </ul>
  );
}

export function ModulesScreen() {
  const trpc = useTRPC();
  const modules = useQuery(trpc.modules.list.queryOptions({ includeArchived: true }));

  const active = modules.data?.filter((module) => module.archivedAt === null) ?? [];
  const archived = modules.data?.filter((module) => module.archivedAt !== null) ?? [];
  const parts = [
    { part: 1, title: "Parte 1", description: "Os fundamentos de um sistema com IA, do modelo à operação." },
    { part: 2, title: "Parte 2", description: "Adaptação, inferência, produto e governança, e os casos do mundo real." },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Módulos"
        description="A meta é chegar ao degrau 3 em todos e ao degrau 4 em dois ou três, nos projetos que você já tem."
      />

      {modules.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2" role="status" aria-label="Carregando módulos">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-36 rounded-md" />
          ))}
        </div>
      ) : modules.isError ? (
        <ErrorState title="Não foi possível carregar os módulos." onRetry={() => modules.refetch()}>
          {DB_HINT}
        </ErrorState>
      ) : active.length === 0 && archived.length === 0 ? (
        <EmptyState title="Nenhum módulo no banco.">
          Rode <code className="font-mono">npm run db:seed</code> para carregar os módulos de content/modules.
        </EmptyState>
      ) : (
        <>
          {parts.map(({ part, title, description }) => {
            const inPart = active.filter((module) => module.part === part);
            if (inPart.length === 0) return null;
            return (
              <Section
                key={part}
                title={title}
                description={description}
                aside={<Badge>{plural(inPart.length, "módulo", "módulos")}</Badge>}
              >
                <ModuleGrid modules={inPart} />
              </Section>
            );
          })}

          {archived.length > 0 ? (
            <details className="group rounded-md border border-line bg-surface">
              <summary className="cursor-pointer rounded-md px-4 py-3 font-medium">
                Arquivados ({archived.length})
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  módulos removidos do conteúdo; as notas continuam aqui
                </span>
              </summary>
              <div className="border-t border-line p-4">
                <ModuleGrid modules={archived} />
              </div>
            </details>
          ) : null}
        </>
      )}
    </PageShell>
  );
}

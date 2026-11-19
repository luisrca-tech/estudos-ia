"use client";

import { buttonVariants } from "@estudos-ia/ui/components/button";
import { EmptyState } from "@estudos-ia/ui/components/empty-state";
import { ErrorState } from "@estudos-ia/ui/components/error-state";
import { PageHeader, PageShell } from "@estudos-ia/ui/components/page";
import { SkeletonLines } from "@estudos-ia/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { SessionList } from "@/components/session-list";
import { DB_HINT } from "@/lib/labels";
import { useTRPC } from "@/utils/trpc";

export function SessionsScreen() {
  const trpc = useTRPC();
  const sessions = useQuery(trpc.sessions.list.queryOptions({ limit: 50 }));

  return (
    <PageShell>
      <PageHeader
        title="Sessões"
        description="As 50 sessões mais recentes. Toda sessão concluída de 5 minutos ou mais pede um resumo com suas palavras em até 24 horas."
      />
      {sessions.isPending ? (
        <SkeletonLines lines={5} />
      ) : sessions.isError ? (
        <ErrorState title="Não foi possível carregar as sessões." onRetry={() => sessions.refetch()}>
          {DB_HINT}
        </ErrorState>
      ) : sessions.data.length === 0 ? (
        <EmptyState
          title="Nenhuma sessão registrada ainda."
          action={
            <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Iniciar pela tela Hoje
            </Link>
          }
        >
          Inicie uma sessão em Hoje ou na página de um módulo. Ela aparece aqui com o tempo planejado e o real.
        </EmptyState>
      ) : (
        <SessionList sessions={sessions.data} />
      )}
    </PageShell>
  );
}

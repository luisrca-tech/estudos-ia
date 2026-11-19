"use client";

import { buttonVariants } from "@estudos-ia/ui/components/button";
import { EmptyState } from "@estudos-ia/ui/components/empty-state";
import { ErrorState } from "@estudos-ia/ui/components/error-state";
import { PageShell } from "@estudos-ia/ui/components/page";
import { Skeleton, SkeletonLines } from "@estudos-ia/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { DB_HINT, isNoteType } from "@/lib/labels";
import { errorCode, useTRPC } from "@/utils/trpc";

import { NoteForm } from "./note-form";

function Loading({ label }: { label: string }) {
  return (
    <PageShell width="reading">
      <div className="flex flex-col gap-4" role="status" aria-label={label}>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-3/5" />
        <SkeletonLines lines={5} />
      </div>
    </PageShell>
  );
}

function Missing({ title, children }: { title: string; children: string }) {
  return (
    <PageShell width="reading">
      <EmptyState
        title={title}
        action={
          <Link href="/modules" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Ver todos os módulos
          </Link>
        }
      >
        {children}
      </EmptyState>
    </PageShell>
  );
}

export function NewNoteScreen({ slug, type, sessionId }: { slug: string; type?: string; sessionId?: string }) {
  const trpc = useTRPC();
  const module = useQuery(trpc.modules.bySlug.queryOptions({ slug }));

  if (module.isPending) return <Loading label="Carregando módulo" />;
  if (module.isError) {
    if (errorCode(module.error) === "NOT_FOUND") {
      return <Missing title="Este módulo não existe.">Escolha um módulo na lista para escrever a nota.</Missing>;
    }
    return (
      <PageShell width="reading">
        <ErrorState title="Não foi possível carregar o módulo." onRetry={() => module.refetch()}>
          {DB_HINT}
        </ErrorState>
      </PageShell>
    );
  }

  return (
    <NoteForm
      module={{ ...module.data, kicker: module.data.content.kicker, title: module.data.content.title }}
      initialType={isNoteType(type) ? type : "summary"}
      sessionId={sessionId && /^[0-9a-f-]{36}$/i.test(sessionId) ? sessionId : undefined}
    />
  );
}

export function EditNoteScreen({ id }: { id: string }) {
  const trpc = useTRPC();
  const note = useQuery(trpc.notes.byId.queryOptions({ id }));

  if (note.isPending) return <Loading label="Carregando nota" />;
  if (note.isError) {
    const code = errorCode(note.error);
    if (code === "NOT_FOUND" || code === "BAD_REQUEST") {
      return <Missing title="Esta nota não existe.">Ela pode ter sido apagada. As notas ficam na página de cada módulo.</Missing>;
    }
    return (
      <PageShell width="reading">
        <ErrorState title="Não foi possível carregar a nota." onRetry={() => note.refetch()}>
          {DB_HINT}
        </ErrorState>
      </PageShell>
    );
  }

  return <NoteForm key={note.data.id} module={note.data.module} note={note.data} />;
}

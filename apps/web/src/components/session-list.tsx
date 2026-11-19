import { Badge } from "@estudos-ia/ui/components/badge";
import { buttonVariants } from "@estudos-ia/ui/components/button";
import Link from "next/link";

import { formatDateTime, formatDuration } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { RouterOutputs } from "@/utils/trpc";

type Session = RouterOutputs["sessions"]["list"][number];

const STATUS: Record<Session["status"], { label: string; tone: "neutral" | "accent" | "success" }> = {
  running: { label: "Em andamento", tone: "accent" },
  completed: { label: "Concluída", tone: "success" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

function SummaryState({ session }: { session: Session }) {
  const { state, hours } = session.summary;
  const link = (
    <Link
      href={routes.newNote(session.module.slug, { type: "summary", sessionId: session.id })}
      className={buttonVariants({ variant: "link", size: "sm" })}
    >
      Escrever resumo
    </Link>
  );

  if (state === "covered") return <Badge tone="success">Resumo escrito</Badge>;
  if (state === "pending") {
    return (
      <>
        <Badge tone="warning">Resumo pendente, faltam {hours} h</Badge>
        {link}
      </>
    );
  }
  if (state === "overdue") {
    return (
      <>
        <Badge tone="danger">Resumo atrasado há {hours} h</Badge>
        {link}
      </>
    );
  }
  return <span className="text-sm text-muted-foreground">Sem cobrança de resumo</span>;
}

/** Session history rows: when, module, planned and real time, status and summary state. */
export function SessionList({ sessions, showModule = true }: { sessions: Session[]; showModule?: boolean }) {
  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-surface">
      {sessions.map((session) => (
        <li key={session.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {formatDateTime(session.startedAt)}
              {showModule ? (
                <>
                  {" · "}
                  <Link href={routes.module(session.module.slug)} className="underline-offset-[3px] hover:underline">
                    {session.module.kicker}
                  </Link>
                </>
              ) : null}
            </p>
            <p className="text-sm text-muted-foreground">
              Planejado {session.plannedMinutes} min
              {session.durationSeconds !== null ? `, real ${formatDuration(session.durationSeconds)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge tone={STATUS[session.status].tone}>{STATUS[session.status].label}</Badge>
            {session.status === "completed" ? <SummaryState session={session} /> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

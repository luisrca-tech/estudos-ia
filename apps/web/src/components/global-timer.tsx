"use client";

import { requiresSummary } from "@estudos-ia/api/rules/summary-alerts";
import { Button } from "@estudos-ia/ui/components/button";
import { formatClock, TimerBar } from "@estudos-ia/ui/components/timer-bar";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { routes } from "@/lib/routes";
import { notificationState, notifySessionEnd, playSessionEndBeeps, primeAudio } from "@/lib/session-signal";
import { useRefreshAll } from "@/lib/use-refresh";
import { useTRPC } from "@/utils/trpc";

const CLOCK_TITLE_PREFIX = /^\d+(:\d{2})+ · /;

/**
 * The running session, visible on every page. Time left is always computed
 * from the server's ends_at, so reloading or reopening the tab loses nothing.
 */
export function GlobalTimer() {
  const trpc = useTRPC();
  const router = useRouter();
  const refreshAll = useRefreshAll();
  const [now, setNow] = useState(() => Date.now());
  const [notificationsBlocked, setNotificationsBlocked] = useState(false);
  const finishedSessionId = useRef<string | null>(null);

  const { data: session } = useQuery(
    trpc.sessions.active.queryOptions(undefined, { refetchInterval: 30_000, refetchOnWindowFocus: true }),
  );

  const summaryRoute = (target: { id: string; module: { slug: string } }) =>
    routes.newNote(target.module.slug, { type: "summary", sessionId: target.id });

  const complete = useMutation(
    trpc.sessions.complete.mutationOptions({
      onSuccess: (completed) => {
        if (!requiresSummary(completed.durationSeconds)) {
          toast.success("Sessão concluída", { description: "Sessão curta: não gera cobrança de resumo." });
          return refreshAll();
        }
        const target = session && session.id === completed.id ? session : null;
        toast.success("Sessão concluída", {
          description: "Escreva seu resumo com suas palavras nas próximas 24 h.",
          duration: 60_000,
          action: target ? { label: "Escrever resumo", onClick: () => router.push(summaryRoute(target)) } : undefined,
        });
        return refreshAll();
      },
      onError: (error) => {
        toast.error("A sessão não foi concluída", { description: error.message });
        return refreshAll();
      },
    }),
  );

  const cancel = useMutation(
    trpc.sessions.cancel.mutationOptions({
      onSuccess: () => {
        toast.success("Sessão cancelada");
        return refreshAll();
      },
      onError: (error) => {
        toast.error("A sessão não foi cancelada", { description: error.message });
        return refreshAll();
      },
    }),
  );

  // One tick per second; the value shown is always ends_at - now, never an accumulated count.
  useEffect(() => {
    if (!session) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [session?.id]);

  // Sound needs a user gesture: any interaction during the session keeps it unlocked after a reload.
  useEffect(() => {
    if (!session) return;
    setNotificationsBlocked(notificationState() === "denied");
    window.addEventListener("pointerdown", primeAudio, { once: true });
    window.addEventListener("keydown", primeAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", primeAudio);
      window.removeEventListener("keydown", primeAudio);
    };
  }, [session?.id]);

  const endsAt = session ? new Date(session.endsAt).getTime() : 0;
  const remainingSeconds = session ? (endsAt - now) / 1000 : 0;

  // End of the countdown: sound, notification, then record the completion.
  useEffect(() => {
    if (!session || remainingSeconds > 0 || finishedSessionId.current === session.id) return;
    finishedSessionId.current = session.id;
    playSessionEndBeeps();
    notifySessionEnd({
      sessionId: session.id,
      kicker: session.module.kicker,
      onClick: () => router.push(summaryRoute(session)),
    });
    complete.mutate({ id: session.id });
  }, [session, remainingSeconds]);

  // Keep the countdown readable in the browser tab while another tab is in front.
  useEffect(() => {
    const base = document.title.replace(CLOCK_TITLE_PREFIX, "");
    document.title = session ? `${formatClock(remainingSeconds)} · ${base}` : base;
  });

  if (!session) return null;

  const totalSeconds = (endsAt - new Date(session.startedAt).getTime()) / 1000;
  const busy = complete.isPending || cancel.isPending;

  return (
    <div className="mx-auto w-full max-w-wide px-4 pb-3 sm:px-6">
      <TimerBar
        remainingSeconds={remainingSeconds}
        totalSeconds={totalSeconds}
        title={session.module.title}
        subtitle={`${session.module.kicker} · sessão de ${session.plannedMinutes} min`}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => {
                finishedSessionId.current = session.id;
                complete.mutate({ id: session.id, early: true });
              }}
            >
              Concluir agora
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Cancelar esta sessão? Ela não vai contar como estudo.")) {
                  finishedSessionId.current = session.id;
                  cancel.mutate({ id: session.id });
                }
              }}
            >
              Cancelar
            </Button>
          </>
        }
      />
      {notificationsBlocked ? (
        <p role="status" className="mt-2 text-sm text-warning">
          As notificações estão bloqueadas neste navegador. Ao fim da sessão você vai ouvir só o som; para receber o
          aviso do sistema, libere as notificações de localhost:3001 nas configurações do site.
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { requiresSummary } from "@estudos-ia/api/rules/summary-alerts";
import { Button } from "@estudos-ia/ui/components/button";
import { ConfirmDialog } from "@estudos-ia/ui/components/confirm-dialog";
import { formatClock, TimerDock } from "@estudos-ia/ui/components/timer-dock";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { moduleLabel } from "@/lib/format";
import { routes } from "@/lib/routes";
import { notificationState, notifySessionEnd, playSessionEndBeeps, primeAudio } from "@/lib/session-signal";
import { rulerTicks, timerPhase } from "@/lib/study-labels";
import { useRefreshAll } from "@/lib/use-refresh";
import { useTRPC, type RouterOutputs } from "@/utils/trpc";

type ActiveSession = NonNullable<RouterOutputs["sessions"]["active"]>;

/** A completed session that still asks for a summary: the dock offers to write it. */
type Finished = {
  sessionId: string;
  slug: string;
  label: string;
  plannedMinutes: number;
  early: boolean;
};

const CLOCK_TITLE_PREFIX = /^\d+(:\d{2})+ · /;

/**
 * Session dock, sticky at the bottom of every page. Time left is always
 * ends_at - now, so reloading or reopening the tab loses nothing.
 */
export function SessionDock() {
  const trpc = useTRPC();
  const router = useRouter();
  const refreshAll = useRefreshAll();
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState<Finished | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [notificationsBlocked, setNotificationsBlocked] = useState(false);
  const handledSessionId = useRef<string | null>(null);

  const { data: session } = useQuery(
    trpc.sessions.active.queryOptions(undefined, { refetchInterval: 30_000, refetchOnWindowFocus: true }),
  );

  const summaryRoute = (target: { sessionId: string; slug: string }) =>
    routes.newNote(target.slug, { type: "summary", sessionId: target.sessionId });

  const toFinished = (target: ActiveSession, early: boolean): Finished => ({
    sessionId: target.id,
    slug: target.module.slug,
    label: moduleLabel(target.module.kicker, target.module.title),
    plannedMinutes: target.plannedMinutes,
    early,
  });

  const complete = useMutation(
    trpc.sessions.complete.mutationOptions({
      onSuccess: (completed, variables) => {
        // Below the minimum a session never asks for a summary (same rule as the alerts).
        if (!requiresSummary(completed.durationSeconds)) {
          setFinished(null);
          toast.success("Sessão concluída", { description: "Sessão curta: não gera cobrança de resumo." });
        } else if (session && session.id === completed.id) {
          setFinished(toFinished(session, Boolean(variables.early)));
        }
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
        setConfirmCancel(false);
        toast.success("Sessão cancelada", { description: "Ela não conta como estudo." });
        return refreshAll();
      },
      onError: (error) => {
        toast.error("A sessão não foi cancelada", { description: error.message });
        return refreshAll();
      },
    }),
  );

  // A new running session replaces any finished one still on screen.
  useEffect(() => {
    if (session) setFinished((current) => (current && current.sessionId !== session.id ? null : current));
  }, [session?.id]);

  // One tick per second; the clock is always recomputed from ends_at.
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
    if (!session || remainingSeconds > 0 || handledSessionId.current === session.id) return;
    handledSessionId.current = session.id;
    playSessionEndBeeps();
    const target = toFinished(session, false);
    notifySessionEnd({
      sessionId: session.id,
      kicker: session.module.kicker,
      onClick: () => {
        setFinished(null);
        router.push(summaryRoute(target));
      },
    });
    complete.mutate({ id: session.id });
  }, [session, remainingSeconds]);

  // Keep the countdown readable in the browser tab while another tab is in front.
  useEffect(() => {
    const base = document.title.replace(CLOCK_TITLE_PREFIX, "");
    document.title = session && remainingSeconds > 0 ? `${formatClock(remainingSeconds)} · ${base}` : base;
  });

  if (finished && !session) {
    return (
      <div className="sticky bottom-0 z-30">
        <TimerDock
          phase="finished"
          remaining="00:00"
          total={formatClock(finished.plannedMinutes * 60)}
          progress={1}
          ticks={rulerTicks(finished.plannedMinutes)}
          status={finished.early ? "Sessão concluída. Escreva enquanto está fresco." : "Tempo esgotado. Escreva enquanto está fresco."}
          module={
            <Link href={routes.module(finished.slug)} className="text-foreground no-underline hover:underline">
              {finished.label}
            </Link>
          }
          actions={
            <>
              <Button
                onClick={() => {
                  setFinished(null);
                  router.push(summaryRoute(finished));
                }}
              >
                Escrever resumo agora
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFinished(null);
                  toast("O resumo fica pendente em Hoje por 24 h.");
                }}
              >
                Concluir, resumo depois
              </Button>
            </>
          }
        />
      </div>
    );
  }

  if (!session) return null;

  const totalSeconds = (endsAt - new Date(session.startedAt).getTime()) / 1000;
  const phase = timerPhase(remainingSeconds);
  const busy = complete.isPending || cancel.isPending;

  return (
    <div className="sticky bottom-0 z-30">
      <TimerDock
        phase={phase === "finished" ? "last-minute" : phase}
        remaining={formatClock(remainingSeconds)}
        total={formatClock(totalSeconds)}
        progress={1 - Math.max(0, remainingSeconds) / totalSeconds}
        ticks={rulerTicks(session.plannedMinutes)}
        status={phase === "running" ? "Sessão em andamento" : "Último minuto: feche a fonte"}
        module={
          <Link href={routes.module(session.module.slug)} className="text-foreground no-underline hover:underline">
            {moduleLabel(session.module.kicker, session.module.title)}
          </Link>
        }
        notice={
          notificationsBlocked
            ? "As notificações estão bloqueadas neste navegador: no fim você vai ouvir só o som. Libere as notificações de localhost:3001 nas configurações do site."
            : undefined
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="min-h-10"
              disabled={busy}
              onClick={() => {
                handledSessionId.current = session.id;
                complete.mutate({ id: session.id, early: true });
              }}
            >
              Concluir
            </Button>
            <Button variant="ghost" size="sm" className="min-h-10" disabled={busy} onClick={() => setConfirmCancel(true)}>
              Cancelar
            </Button>
          </>
        }
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancelar esta sessão?"
        description="Ela fica registrada como cancelada, não conta como estudo e não pede resumo."
        confirmLabel="Cancelar sessão"
        cancelLabel="Continuar sessão"
        pending={cancel.isPending}
        onConfirm={() => {
          handledSessionId.current = session.id;
          cancel.mutate({ id: session.id });
        }}
      />
    </div>
  );
}

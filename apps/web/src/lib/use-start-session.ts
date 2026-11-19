"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@/utils/trpc";

import { DEFAULT_SESSION_MINUTES } from "./labels";
import { primeAudio, requestNotificationPermission } from "./session-signal";
import { uiActions } from "./ui-store";
import { useRefreshAll } from "./use-refresh";

/** Starts a study session. Call it from a click or key press: it unlocks sound and asks for notifications. */
export function useStartSession() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const refreshAll = useRefreshAll();
  const mutation = useMutation(
    trpc.sessions.start.mutationOptions({
      onSuccess: () => {
        toast.success("Sessão iniciada");
        return refreshAll();
      },
      onError: (error) => {
        toast.error("A sessão não foi iniciada", { description: error.message });
        return refreshAll();
      },
    }),
  );

  const start = async (moduleId: string, plannedMinutes: number = DEFAULT_SESSION_MINUTES) => {
    primeAudio();
    await requestNotificationPermission();
    mutation.mutate({ moduleId, plannedMinutes });
  };

  /** Shortcut S: the module on screen, otherwise the suggested one. */
  const startDefault = async () => {
    const active = await queryClient.fetchQuery(trpc.sessions.active.queryOptions());
    if (active) {
      toast.error("Já existe uma sessão em andamento", { description: "Conclua ou cancele a atual antes de iniciar outra." });
      return;
    }
    const moduleId =
      uiActions.getCurrentModule()?.id ?? (await queryClient.fetchQuery(trpc.today.get.queryOptions())).suggestedModule?.id;
    if (!moduleId) {
      toast.error("Nenhum módulo para estudar", { description: "Rode npm run db:seed para carregar os módulos." });
      return;
    }
    await start(moduleId, DEFAULT_SESSION_MINUTES);
  };

  return { pending: mutation.isPending, start, startDefault };
}

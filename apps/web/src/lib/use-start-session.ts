"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@/utils/trpc";

import { primeAudio, requestNotificationPermission } from "./session-signal";
import { useRefreshAll } from "./use-refresh";

/** Starts a study session. Must be called from a click: it unlocks sound and asks for notifications. */
export function useStartSession() {
  const trpc = useTRPC();
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

  return {
    pending: mutation.isPending,
    start: async (moduleId: string, plannedMinutes: number) => {
      primeAudio();
      await requestNotificationPermission();
      mutation.mutate({ moduleId, plannedMinutes });
    },
  };
}

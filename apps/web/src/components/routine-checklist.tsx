"use client";

import { ChecklistItem } from "@estudos-ia/ui/components/checklist-item";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Markdown } from "@/components/markdown";
import { useRefreshAll } from "@/lib/use-refresh";
import { useTRPC, type RouterOutputs } from "@/utils/trpc";

type RoutineItem = RouterOutputs["routines"]["current"]["daily"]["items"][number];

/** Routine items of the current period; checking writes right away. */
export function RoutineChecklist({ items }: { items: RoutineItem[] }) {
  const trpc = useTRPC();
  const refreshAll = useRefreshAll();
  const toggle = useMutation(
    trpc.routines.toggle.mutationOptions({
      onSettled: () => refreshAll(),
      onError: (error) => toast.error("O item não foi salvo", { description: error.message }),
    }),
  );

  return (
    <ul className="-mx-2 flex flex-col">
      {items.map((item) => {
        // Show the new state while the write is in flight.
        const pending = toggle.isPending && toggle.variables.routineItemId === item.id;
        return (
          <li key={item.id}>
            <ChecklistItem
              checked={pending ? toggle.variables.checked : item.checked}
              disabled={pending}
              onCheckedChange={(checked) => toggle.mutate({ routineItemId: item.id, checked })}
            >
              <Markdown inline>{item.label}</Markdown>
            </ChecklistItem>
          </li>
        );
      })}
    </ul>
  );
}

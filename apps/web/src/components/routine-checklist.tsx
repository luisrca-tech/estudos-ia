"use client";

import { ChecklistItem } from "@estudos-ia/ui/components/checklist-item";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Markdown } from "@/components/markdown";
import { splitRoutineLabel } from "@/lib/routine-labels";
import { useRefreshAll } from "@/lib/use-refresh";
import { useTRPC, type RouterOutputs } from "@/utils/trpc";

type RoutineItem = RouterOutputs["routines"]["current"]["daily"]["items"][number];

type RoutineChecklistProps = {
  items: RoutineItem[];
  /** Show the duration hint under each item (from the label, or the rhythm's time). */
  hints?: boolean;
  divided?: boolean;
};

/** Routine items of the current period; checking writes right away. */
export function RoutineChecklist({ items, hints, divided }: RoutineChecklistProps) {
  const trpc = useTRPC();
  const refreshAll = useRefreshAll();
  const toggle = useMutation(
    trpc.routines.toggle.mutationOptions({
      onSettled: () => refreshAll(),
      onError: (error) => toast.error("O item não foi salvo", { description: error.message }),
    }),
  );

  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        // Show the new state while the write is in flight.
        const pending = toggle.isPending && toggle.variables.routineItemId === item.id;
        const { text, duration } = splitRoutineLabel(item.label);
        return (
          <li key={item.id}>
            <ChecklistItem
              checked={pending ? toggle.variables.checked : item.checked}
              disabled={pending}
              divided={divided}
              hint={hints ? (duration ?? item.hint ?? undefined) : undefined}
              onCheckedChange={(checked) => toggle.mutate({ routineItemId: item.id, checked })}
            >
              <Markdown inline>{hints ? text : item.label}</Markdown>
            </ChecklistItem>
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import { Button } from "@estudos-ia/ui/components/button";
import { Input } from "@estudos-ia/ui/components/input";
import { Segmented } from "@estudos-ia/ui/components/segmented";
import { PlayIcon } from "lucide-react";
import { useId, useState } from "react";

import {
  DEFAULT_SESSION_MINUTES,
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  SESSION_PRESETS,
} from "@/lib/labels";
import { useStartSession } from "@/lib/use-start-session";

type Choice = `${(typeof SESSION_PRESETS)[number]}` | "custom";

const OPTIONS: ReadonlyArray<{ value: Choice; label: string }> = [
  ...SESSION_PRESETS.map((minutes) => ({ value: `${minutes}` as Choice, label: `${minutes} min` })),
  { value: "custom", label: "Outro" },
];

/** Duration choice (15, 25, 45 or a custom 5–180 min) and the button that starts the session. */
export function StartSession({ moduleId, disabled }: { moduleId: string | undefined; disabled?: boolean }) {
  const id = useId();
  const { start, pending } = useStartSession();
  const [choice, setChoice] = useState<Choice>(`${DEFAULT_SESSION_MINUTES}`);
  const [custom, setCustom] = useState("5");

  const minutes = choice === "custom" ? Number(custom) : Number(choice);
  const valid = Number.isInteger(minutes) && minutes >= MIN_SESSION_MINUTES && minutes <= MAX_SESSION_MINUTES;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Duração da sessão" name={`${id}-minutes`} value={choice} onValueChange={setChoice} options={OPTIONS} />
        {choice === "custom" ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Input
              type="number"
              inputMode="numeric"
              min={MIN_SESSION_MINUTES}
              max={MAX_SESSION_MINUTES}
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              aria-label="Minutos da sessão"
              aria-invalid={!valid || undefined}
              className="w-20"
            />
            min (de {MIN_SESSION_MINUTES} a {MAX_SESSION_MINUTES})
          </label>
        ) : null}
      </div>
      <div>
        <Button
          size="lg"
          loading={pending}
          disabled={disabled || !moduleId || !valid}
          onClick={() => moduleId && start(moduleId, minutes)}
        >
          <PlayIcon />
          {valid ? `Iniciar sessão de ${minutes} min` : "Iniciar sessão"}
        </Button>
      </div>
    </div>
  );
}

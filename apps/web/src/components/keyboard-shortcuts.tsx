"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { routes } from "@/lib/routes";
import { shortcutFor } from "@/lib/shortcuts";
import { uiActions } from "@/lib/ui-store";
import { useStartSession } from "@/lib/use-start-session";

/** Global keys: ⌘K palette, S session, R reviews, N new note. ⌘S, Space and 1/2 belong to their screens. */
export function KeyboardShortcuts() {
  const router = useRouter();
  const { startDefault } = useStartSession();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      const action = shortcutFor(event);
      if (!action || action === "save") return;
      event.preventDefault();
      if (action === "palette") {
        uiActions.setPaletteOpen(true);
      } else if (action === "session") {
        void startDefault();
      } else if (action === "reviews") {
        router.push("/reviews");
      } else if (action === "new-note") {
        const current = uiActions.getCurrentModule();
        if (current) router.push(routes.newNote(current.slug));
        else toast("Abra um módulo para criar uma nota", { description: "Ou use ⌘K para escolher um." });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, startDefault]);

  return null;
}

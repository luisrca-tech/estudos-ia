"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** Switches between light and dark; the first visit follows the system. */
export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is only known in the browser; the server renders a neutral label.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const dark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={mounted ? (dark ? "Usar tema claro" : "Usar tema escuro") : "Alternar tema"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="inline-flex size-11 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-surface-sunken hover:text-foreground"
    >
      <SunIcon aria-hidden className="hidden size-[18px] dark:block" />
      <MoonIcon aria-hidden className="size-[18px] dark:hidden" />
    </button>
  );
}

"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

/** Switches between light and dark; the first visit follows the system. */
export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="inline-flex size-11 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-surface-sunken hover:text-foreground"
    >
      <SunIcon aria-hidden className="hidden size-[18px] dark:block" />
      <MoonIcon aria-hidden className="size-[18px] dark:hidden" />
    </button>
  );
}

"use client";

import { CommandDialog } from "@estudos-ia/ui/components/command-dialog";
import { cn } from "@estudos-ia/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import type { Route } from "next";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useId, useMemo, useState } from "react";

import { formatDate, moduleNumber } from "@/lib/format";
import { noteTypeLabel } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { matchesQuery } from "@/lib/search";
import { uiActions, useUiState } from "@/lib/ui-store";
import { signOut as signOutRequest } from "@/lib/auth/sign-out";
import { useStartSession } from "@/lib/use-start-session";
import { useTRPC } from "@/utils/trpc";

type Item = { id: string; group: "Ações" | "Módulos" | "Notas"; label: string; hint?: string; run: () => void };

/** ⌘K: go to a module, a note or run an action. */
export function CommandPalette({ signOut }: { signOut?: boolean }) {
  const { paletteOpen, currentModule } = useUiState();
  const trpc = useTRPC();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { startDefault } = useStartSession();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const deferredQuery = useDeferredValue(query);

  const modules = useQuery({ ...trpc.modules.list.queryOptions(), enabled: paletteOpen });
  const notes = useQuery({ ...trpc.notes.search.queryOptions({ query: deferredQuery, limit: 8 }), enabled: paletteOpen });

  const close = () => uiActions.setPaletteOpen(false);
  const go = (href: Route) => () => {
    close();
    router.push(href);
  };

  const items = useMemo<Item[]>(() => {
    const actions: Item[] = [
      { id: "a-session", group: "Ações", label: "Iniciar sessão de 25 min", hint: "S", run: () => { close(); void startDefault(); } },
      { id: "a-reviews", group: "Ações", label: "Começar revisão", hint: "R", run: go("/reviews") },
      ...(currentModule
        ? [{ id: "a-note", group: "Ações" as const, label: `Nova nota em ${moduleNumber(currentModule.kicker)}`, hint: "N", run: go(routes.newNote(currentModule.slug)) }]
        : []),
      { id: "a-today", group: "Ações", label: "Ir para Hoje", run: go("/") },
      { id: "a-modules", group: "Ações", label: "Ir para Módulos", run: go("/modules") },
      { id: "a-routines", group: "Ações", label: "Ir para Rotinas", run: go("/routines") },
      { id: "a-sessions", group: "Ações", label: "Ir para Sessões", run: go("/sessions") },
      { id: "a-import", group: "Ações", label: "Importar anotações", run: go("/import") },
      {
        id: "a-theme",
        group: "Ações",
        label: resolvedTheme === "dark" ? "Usar tema claro" : "Usar tema escuro",
        run: () => {
          close();
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
        },
      },
      ...(signOut
        ? [{ id: "a-sign-out", group: "Ações" as const, label: "Sair", run: () => { close(); void signOutRequest(); } }]
        : []),
    ];
    const moduleItems: Item[] = (modules.data ?? []).map((module) => ({
      id: `m-${module.id}`,
      group: "Módulos",
      label: module.title,
      hint: module.kicker,
      run: go(routes.module(module.slug)),
    }));
    const noteItems: Item[] = (notes.data ?? []).map((note) => ({
      id: `n-${note.id}`,
      group: "Notas",
      label: note.title,
      hint: `${noteTypeLabel(note.type)} · ${moduleNumber(note.module.kicker)} · ${formatDate(note.createdAt)}`,
      run: go(routes.note(note.id)),
    }));
    return [
      ...actions.filter((item) => matchesQuery(item.label, query)),
      ...moduleItems.filter((item) => matchesQuery(`${item.hint} ${item.label}`, query)).slice(0, query ? 8 : 15),
      ...noteItems,
    ];
  }, [modules.data, notes.data, query, currentModule, resolvedTheme, signOut]);

  useEffect(() => setActive(0), [query, paletteOpen]);
  useEffect(() => {
    if (!paletteOpen) setQuery("");
  }, [paletteOpen]);
  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => Math.min(items.length - 1, current + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(0, current - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      items[active]?.run();
    }
  };

  return (
    <CommandDialog open={paletteOpen} onOpenChange={uiActions.setPaletteOpen} label="Ir para">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <SearchIcon aria-hidden className="size-4 text-muted-foreground" />
        <input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
          aria-label="Buscar módulo, nota ou ação"
          placeholder="Buscar módulo, nota ou ação"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          className="h-13 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      <ul id={listId} role="listbox" aria-label="Resultados" className="overflow-y-auto py-2">
        {items.length === 0 ? (
          <li className="px-4 py-6 text-center text-muted-foreground">Nada encontrado para "{query}".</li>
        ) : null}
        {items.map((item, index) => (
          <li key={item.id} role="presentation">
            {index === 0 || items[index - 1]?.group !== item.group ? (
              <p role="presentation" className="px-4 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                {item.group}
              </p>
            ) : null}
            <div
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseMove={() => setActive(index)}
              onClick={item.run}
              className={cn(
                "mx-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-3 py-1.5",
                index === active ? "bg-accent-soft text-foreground" : "text-foreground",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.label}</span>
                {item.hint && item.group !== "Ações" ? <span className="block truncate text-[13px] text-muted-foreground">{item.hint}</span> : null}
              </span>
              {item.hint && item.group === "Ações" ? <kbd className="rounded-[3px] border border-line px-1.5 font-mono text-xs text-muted-foreground">{item.hint}</kbd> : null}
            </div>
          </li>
        ))}
      </ul>
    </CommandDialog>
  );
}

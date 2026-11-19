"use client";

import { Kbd } from "@estudos-ia/ui/components/button";
import { cn } from "@estudos-ia/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { uiActions } from "@/lib/ui-store";
import { useTRPC } from "@/utils/trpc";

import { ModeToggle } from "./mode-toggle";
import { StairsIcon } from "./stairs-icon";

const LINKS: ReadonlyArray<{ href: Route; label: string; match: (path: string) => boolean; reviews?: true }> = [
  { href: "/", label: "Hoje", match: (path) => path === "/" },
  { href: "/modules", label: "Módulos", match: (path) => path.startsWith("/modules") || path.startsWith("/notes") },
  { href: "/reviews", label: "Revisões", match: (path) => path.startsWith("/reviews"), reviews: true },
  { href: "/routines", label: "Rotinas", match: (path) => path.startsWith("/routines") },
  { href: "/sessions", label: "Sessões", match: (path) => path.startsWith("/sessions") },
  { href: "/import", label: "Importar", match: (path) => path.startsWith("/import") },
];

export default function Header({ signOut = false }: { signOut?: boolean }) {
  const pathname = usePathname();
  const trpc = useTRPC();
  const due = useQuery(trpc.reviews.due.queryOptions(undefined, { refetchInterval: 60_000 }));
  const dueCount = due.data?.length ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex min-h-header w-full max-w-page flex-wrap items-stretch gap-x-6 px-4 sm:px-8 lg:flex-nowrap">
        <Link href="/" className="mr-auto flex items-center gap-2 font-serif text-[17px] font-semibold text-foreground no-underline lg:mr-0">
          <StairsIcon />
          estudos-ia
        </Link>
        <nav aria-label="Principal" className="order-last -mx-3 flex w-full min-w-0 items-stretch overflow-x-auto lg:order-none lg:mx-0 lg:w-auto lg:flex-1">
          {LINKS.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-1.5 px-3 whitespace-nowrap no-underline -outline-offset-2 lg:min-h-header",
                  active
                    ? "font-medium text-foreground shadow-[inset_0_-2px_0_var(--foreground)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
                {link.reviews && dueCount > 0 ? (
                  <span
                    aria-label={`${dueCount} para hoje`}
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-soft px-1.5 text-xs font-semibold text-accent"
                  >
                    {dueCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => uiActions.setPaletteOpen(true)}
            aria-keyshortcuts="Meta+K Control+K"
            className="inline-flex h-9 cursor-pointer items-center gap-3 rounded-sm border border-line bg-background pr-2 pl-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="inline-flex items-center gap-2">
              <SearchIcon aria-hidden className="size-[15px]" />
              <span className="hidden sm:inline">Ir para…</span>
              <span className="sr-only sm:hidden">Ir para</span>
            </span>
            <Kbd className="bg-surface">⌘K</Kbd>
          </button>
          <ModeToggle />
          {signOut ? (
            <form method="post" action="/auth/logout">
              <button
                type="submit"
                className="inline-flex h-9 cursor-pointer items-center rounded-sm px-2.5 text-sm text-muted-foreground hover:text-foreground"
              >
                Sair
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </header>
  );
}

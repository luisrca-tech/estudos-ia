"use client";

import { cn } from "@estudos-ia/ui/lib/utils";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { GlobalTimer } from "./global-timer";
import { ModeToggle } from "./mode-toggle";

const LINKS: ReadonlyArray<{ href: Route; label: string; match: (path: string) => boolean }> = [
  { href: "/", label: "Hoje", match: (path) => path === "/" },
  { href: "/modules", label: "Módulos", match: (path) => path.startsWith("/modules") || path.startsWith("/notes") },
  { href: "/reviews", label: "Revisões", match: (path) => path.startsWith("/reviews") },
  { href: "/routines", label: "Rotinas", match: (path) => path.startsWith("/routines") },
  { href: "/sessions", label: "Sessões", match: (path) => path.startsWith("/sessions") },
  { href: "/import", label: "Importar", match: (path) => path.startsWith("/import") },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-wide flex-wrap items-center gap-x-4 px-4 sm:flex-nowrap sm:px-6">
        <Link href="/" className="mr-auto shrink-0 py-2 font-serif text-lg font-semibold sm:mr-0 sm:py-3">
          Estudos de IA
        </Link>
        <nav aria-label="Principal" className="order-last -mx-3 flex w-full min-w-0 gap-1 overflow-x-auto sm:order-none sm:mx-0 sm:w-auto sm:flex-1">
          {LINKS.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "border-b-2 px-3 py-2 text-base sm:py-3.5 whitespace-nowrap transition-colors -outline-offset-2",
                  active
                    ? "border-accent font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <ModeToggle />
      </div>
      <GlobalTimer />
    </header>
  );
}

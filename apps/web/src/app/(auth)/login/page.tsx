import { buttonVariants } from "@estudos-ia/ui/components/button";
import { controlClassName } from "@estudos-ia/ui/components/input";
import { cn } from "@estudos-ia/ui/lib/utils";
import type { Metadata } from "next";

import { StairsIcon } from "@/components/stairs-icon";
import { safeNext } from "@/lib/auth/safe-next";

export const metadata: Metadata = { title: "Entrar" };

type LoginPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Login for the deployed app. Plain form post, so it works before any JavaScript loads. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeNext(first(params.next));
  const failed = first(params.error) === "1";

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-[23.75rem] flex-col gap-8">
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <StairsIcon size={28} strokeWidth={2} />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-[2rem] leading-tight font-semibold">Degrau</h1>
            <p className="text-muted-foreground">Um degrau por dia em Engenharia de IA</p>
          </div>
        </header>

        <form method="post" action="/auth/login" className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6 shadow-floating">
          {failed ? (
            <p id="login-error" role="alert" className="rounded-md border border-danger/30 border-l-4 border-l-danger bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">
              Usuário ou senha incorretos.
            </p>
          ) : null}
          <input type="hidden" name="next" value={next} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-user" className="text-sm font-medium">
              Usuário
            </label>
            <input
              id="login-user"
              name="user"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              aria-invalid={failed || undefined}
              aria-describedby={failed ? "login-error" : undefined}
              className={cn(controlClassName, "h-11")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-sm font-medium">
              Senha
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={failed || undefined}
              aria-describedby={failed ? "login-error" : undefined}
              className={cn(controlClassName, "h-11")}
            />
          </div>
          <button type="submit" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}

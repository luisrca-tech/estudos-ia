import { NextResponse, type NextRequest } from "next/server";

import { getAuthConfig } from "@/lib/auth/config";
import { checkCredentials } from "@/lib/auth/credentials";
import { isSameOrigin, sessionCookie } from "@/lib/auth/http";
import { safeNext } from "@/lib/auth/safe-next";
import { signSessionToken } from "@/lib/auth/session-token";

/** Fixed delay on a failed login, to slow down guessing. */
const FAILURE_DELAY_MS = 500;

const field = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new Response("Origem não permitida.", { status: 403 });

  const auth = getAuthConfig();
  const form = await request.formData().catch(() => new FormData());
  const next = safeNext(field(form, "next"));
  if (!auth.enabled) return NextResponse.redirect(new URL("/", request.url), 303);

  const valid =
    Boolean(auth.secret) &&
    checkCredentials({ user: field(form, "user").trim(), password: field(form, "password") }, { user: auth.user, password: auth.password });

  if (!valid || !auth.secret) {
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    const back = new URL("/login", request.url);
    back.searchParams.set("error", "1");
    if (next !== "/") back.searchParams.set("next", next);
    return NextResponse.redirect(back, 303);
  }

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(sessionCookie(await signSessionToken(auth.secret, new Date())));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

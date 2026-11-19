/** Shared helpers of the login and logout route handlers. */
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./session-token";

export const sessionCookie = (value: string, maxAge = SESSION_MAX_AGE_SECONDS) => ({
  name: SESSION_COOKIE,
  value,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

/** Rejects cross-site form posts: a present Origin must match the host. */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return origin === null;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}


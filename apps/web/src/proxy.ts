import { NextResponse, type NextRequest } from "next/server";

import { ENV } from "@/env";
import { isAuthorized } from "@/lib/basic-auth";

/** User checked by the lock when APP_USER is not set. */
const DEFAULT_USER = "luis";

/**
 * Password lock for the whole app (pages and /api/trpc). It is off while
 * APP_PASSWORD is unset or empty, so local development needs no login.
 */
export function proxy(request: NextRequest) {
  if (isAuthorized(request.headers.get("authorization"), ENV.APP_USER || DEFAULT_USER, ENV.APP_PASSWORD)) {
    return NextResponse.next();
  }
  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="estudos-ia", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  // Everything except static assets; /api/trpc stays protected.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

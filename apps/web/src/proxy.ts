import { NextResponse, type NextRequest } from "next/server";

import { getAuthConfig } from "@/lib/auth/config";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session-token";

/** Paths open without a session, besides the static assets left out by the matcher. */
function isPublic(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    /^\/(icon|apple-icon|opengraph-image|twitter-image)[^/]*$/.test(pathname)
  );
}

/**
 * Login lock for the whole app. Off while APP_PASSWORD is unset, so local
 * development stays open. Pages without a session go to /login; the API gets 401.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const auth = getAuthConfig();

  if (!auth.enabled) {
    return pathname === "/login" ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  const signedIn = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, auth.secret, new Date());

  if (pathname === "/login") {
    return signedIn ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (signedIn || isPublic(pathname)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized", message: "Entre para continuar." }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

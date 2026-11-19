import { NextResponse, type NextRequest } from "next/server";

import { isSameOrigin, sessionCookie } from "@/lib/auth/http";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new Response("Origem não permitida.", { status: 403 });
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(sessionCookie("", 0));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

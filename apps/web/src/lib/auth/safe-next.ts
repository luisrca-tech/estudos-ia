/** Where to go after login: only internal paths, never another origin or the login itself. */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  // Backslashes and control characters can turn a path into another origin in browsers.
  if (value.includes("\\") || /[\u0000-\u001f\u007f\s]/.test(value)) return "/";
  try {
    const url = new URL(value, "http://degrau.local");
    if (url.origin !== "http://degrau.local") return "/";
    if (url.pathname === "/login" || url.pathname.startsWith("/login/")) return "/";
  } catch {
    return "/";
  }
  return value;
}

/**
 * HTTP Basic Auth check for the password lock. Pure and runtime-agnostic
 * (Web APIs only), so it works in the proxy whatever runtime it uses.
 */

const encoder = new TextEncoder();

/** Compares two strings without exiting early, also when lengths differ. */
export function timingSafeEqualText(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let index = 0; index < length; index++) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}

function decodeBase64Utf8(value: string): string | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/**
 * True when the request may pass: the lock is off (no password configured)
 * or the Authorization header carries the expected user and password.
 */
export function isAuthorized(
  authorizationHeader: string | null | undefined,
  expectedUser: string,
  expectedPassword: string | null | undefined,
): boolean {
  if (!expectedPassword) return true;
  if (!authorizationHeader) return false;

  const match = /^Basic\s+(\S+)\s*$/i.exec(authorizationHeader);
  if (!match) return false;
  const decoded = decodeBase64Utf8(match[1]!);
  if (decoded === null) return false;

  // RFC 7617: the user cannot contain a colon, the password can.
  const separator = decoded.indexOf(":");
  if (separator === -1) return false;
  const userOk = timingSafeEqualText(decoded.slice(0, separator), expectedUser);
  const passwordOk = timingSafeEqualText(decoded.slice(separator + 1), expectedPassword);
  return userOk && passwordOk;
}

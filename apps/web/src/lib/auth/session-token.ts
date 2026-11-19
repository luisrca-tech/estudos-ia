/**
 * Signed session token: "v1.<expiry ms>.<base64url HMAC-SHA256>". Web Crypto
 * only, so it runs in the proxy whatever its runtime.
 */
import { timingSafeEqualText } from "./credentials";

export const SESSION_COOKIE = "degrau_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const VERSION = "v1";
const encoder = new TextEncoder();

function base64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

export async function signSessionToken(secret: string, now: Date): Promise<string> {
  if (!secret) throw new Error("APP_SESSION_SECRET is required to sign a session.");
  const expiry = now.getTime() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${VERSION}.${expiry}`;
  return `${payload}.${await sign(secret, payload)}`;
}

export async function verifySessionToken(token: string | null | undefined, secret: string | null | undefined, now: Date): Promise<boolean> {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expiry, signature] = parts as [string, string, string];
  if (version !== VERSION || !/^\d{1,16}$/.test(expiry) || !signature) return false;
  // Always compute the signature, so an expired token costs the same as a valid one.
  const expected = await sign(secret, `${version}.${expiry}`);
  const signatureOk = timingSafeEqualText(signature, expected);
  return signatureOk && Number(expiry) > now.getTime();
}

import { describe, expect, it } from "vitest";

import { SESSION_MAX_AGE_SECONDS, signSessionToken, verifySessionToken } from "./session-token";

const SECRET = "a-test-secret-with-more-than-32-characters";
const now = new Date("2026-11-19T12:00:00Z");

describe("session token", () => {
  it("signs a token that verifies until it expires", async () => {
    const token = await signSessionToken(SECRET, now);
    expect(await verifySessionToken(token, SECRET, now)).toBe(true);
    const later = new Date(now.getTime() + (SESSION_MAX_AGE_SECONDS - 60) * 1000);
    expect(await verifySessionToken(token, SECRET, later)).toBe(true);
  });

  it("rejects an expired token", async () => {
    const token = await signSessionToken(SECRET, now);
    const after = new Date(now.getTime() + (SESSION_MAX_AGE_SECONDS + 1) * 1000);
    expect(await verifySessionToken(token, SECRET, after)).toBe(false);
  });

  it("rejects a tampered expiry or signature", async () => {
    const token = await signSessionToken(SECRET, now);
    const [version, expiry, signature] = token.split(".");
    const farFuture = String(Number(expiry) + 365 * 86_400_000);
    expect(await verifySessionToken(`${version}.${farFuture}.${signature}`, SECRET, now)).toBe(false);
    const flipped = `${signature!.slice(0, -1)}${signature!.endsWith("A") ? "B" : "A"}`;
    expect(await verifySessionToken(`${version}.${expiry}.${flipped}`, SECRET, now)).toBe(false);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signSessionToken("another-secret-that-is-also-long-enough", now);
    expect(await verifySessionToken(token, SECRET, now)).toBe(false);
  });

  it("rejects malformed tokens and a missing secret", async () => {
    for (const bad of [undefined, "", "garbage", "v1.abc.def", "v2.1.2", "v1..", "v1.1"]) {
      expect(await verifySessionToken(bad, SECRET, now)).toBe(false);
    }
    const token = await signSessionToken(SECRET, now);
    expect(await verifySessionToken(token, "", now)).toBe(false);
    await expect(signSessionToken("", now)).rejects.toThrow();
  });
});

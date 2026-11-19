import { describe, expect, it } from "vitest";

import { checkCredentials, timingSafeEqualText } from "./credentials";

describe("timingSafeEqualText", () => {
  it("compares byte by byte, including different lengths and UTF-8", () => {
    expect(timingSafeEqualText("abc", "abc")).toBe(true);
    expect(timingSafeEqualText("abc", "abd")).toBe(false);
    expect(timingSafeEqualText("abc", "abcd")).toBe(false);
    expect(timingSafeEqualText("", "")).toBe(true);
    expect(timingSafeEqualText("ção", "ção")).toBe(true);
    expect(timingSafeEqualText("ção", "cao")).toBe(false);
  });
});

describe("checkCredentials", () => {
  const expected = { user: "luis", password: "test123" };

  it("accepts the right user and password", () => {
    expect(checkCredentials({ user: "luis", password: "test123" }, expected)).toBe(true);
  });

  it("rejects a wrong user or a wrong password", () => {
    expect(checkCredentials({ user: "ana", password: "test123" }, expected)).toBe(false);
    expect(checkCredentials({ user: "luis", password: "test124" }, expected)).toBe(false);
    expect(checkCredentials({ user: "luis", password: "test1234" }, expected)).toBe(false);
    expect(checkCredentials({ user: "luis", password: "" }, expected)).toBe(false);
  });

  it("never authenticates when no password is configured", () => {
    expect(checkCredentials({ user: "luis", password: "" }, { user: "luis", password: "" })).toBe(false);
    expect(checkCredentials({ user: "luis", password: "x" }, { user: "luis", password: undefined })).toBe(false);
  });

  it("keeps colons and UTF-8 in passwords", () => {
    expect(checkCredentials({ user: "joão", password: "a:b:ção-🔒" }, { user: "joão", password: "a:b:ção-🔒" })).toBe(true);
    expect(checkCredentials({ user: "joao", password: "a:b:ção-🔒" }, { user: "joão", password: "a:b:ção-🔒" })).toBe(false);
  });
});

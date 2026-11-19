import { describe, expect, it } from "vitest";

import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps internal paths with their query", () => {
    expect(safeNext("/")).toBe("/");
    expect(safeNext("/modules/x?y=1")).toBe("/modules/x?y=1");
    expect(safeNext("/reviews#top")).toBe("/reviews#top");
  });

  it("sends everything else to /", () => {
    for (const value of [
      "//evil.com",
      "/\\evil",
      "/\\/evil.com",
      "https://evil.com",
      "javascript:alert(1)",
      "",
      null,
      undefined,
      "modules",
      "/x\r\nSet-Cookie:a=b",
      " /modules",
      "/login",
      "/login?next=/x",
    ]) {
      expect(safeNext(value)).toBe("/");
    }
  });
});

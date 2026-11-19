import { describe, expect, it } from "vitest";

import { isTypingTarget, shortcutFor } from "./shortcuts";

const input = (type = "text") => ({ tagName: "INPUT", type });
const key = (k: string, extra: Partial<Parameters<typeof shortcutFor>[0]> = {}) => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  target: { tagName: "BODY" },
  ...extra,
});

describe("isTypingTarget", () => {
  it("is true for text fields, textareas, selects and contenteditable", () => {
    expect(isTypingTarget(input())).toBe(true);
    expect(isTypingTarget(input("search"))).toBe(true);
    expect(isTypingTarget(input("number"))).toBe(true);
    expect(isTypingTarget({ tagName: "TEXTAREA" })).toBe(true);
    expect(isTypingTarget({ tagName: "SELECT" })).toBe(true);
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("is false for buttons, checkboxes, radios and the page", () => {
    expect(isTypingTarget(input("checkbox"))).toBe(false);
    expect(isTypingTarget(input("radio"))).toBe(false);
    expect(isTypingTarget(input("file"))).toBe(false);
    expect(isTypingTarget({ tagName: "BUTTON" })).toBe(false);
    expect(isTypingTarget({ tagName: "BODY" })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe("shortcutFor", () => {
  it("maps single keys outside fields", () => {
    expect(shortcutFor(key("s"))).toBe("session");
    expect(shortcutFor(key("S", { shiftKey: true }))).toBe("session");
    expect(shortcutFor(key("r"))).toBe("reviews");
    expect(shortcutFor(key("n"))).toBe("new-note");
    expect(shortcutFor(key("x"))).toBeNull();
  });

  it("ignores single keys while typing", () => {
    expect(shortcutFor(key("s", { target: input() }))).toBeNull();
    expect(shortcutFor(key("r", { target: { tagName: "TEXTAREA" } }))).toBeNull();
    expect(shortcutFor(key("n", { target: { tagName: "DIV", isContentEditable: true } }))).toBeNull();
  });

  it("ignores single keys combined with a modifier (browser shortcuts stay intact)", () => {
    expect(shortcutFor(key("r", { ctrlKey: true }))).toBeNull();
    expect(shortcutFor(key("r", { metaKey: true }))).toBeNull();
    expect(shortcutFor(key("n", { altKey: true }))).toBeNull();
  });

  it("⌘K / Ctrl+K and ⌘S / Ctrl+S work even inside fields", () => {
    expect(shortcutFor(key("k", { metaKey: true, target: input() }))).toBe("palette");
    expect(shortcutFor(key("k", { ctrlKey: true }))).toBe("palette");
    expect(shortcutFor(key("s", { metaKey: true, target: { tagName: "TEXTAREA" } }))).toBe("save");
    expect(shortcutFor(key("S", { ctrlKey: true }))).toBe("save");
  });
});

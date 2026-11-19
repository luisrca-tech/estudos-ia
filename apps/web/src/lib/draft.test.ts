import { describe, expect, it } from "vitest";

import { draftKey, parseDraft, serializeDraft, type NoteDraft } from "./draft";

const draft: NoteDraft = {
  type: "summary",
  title: "Ferramenta resolve intenção",
  body: "**Afirmação:** x",
  recallPrompt: "",
  evidenceGrade: "",
  sourceUrl: "",
};

describe("draftKey", () => {
  it("uses the note id when editing", () => {
    expect(draftKey({ noteId: "n1", moduleId: "m1" })).toBe("estudos-ia:draft:note:n1");
  });

  it("separates new notes by module and session", () => {
    expect(draftKey({ moduleId: "m1" })).toBe("estudos-ia:draft:new:m1:none");
    expect(draftKey({ moduleId: "m1", sessionId: "s1" })).toBe("estudos-ia:draft:new:m1:s1");
    expect(draftKey({ moduleId: "m2", sessionId: "s1" })).not.toBe(draftKey({ moduleId: "m1", sessionId: "s1" }));
  });
});

describe("serializeDraft / parseDraft", () => {
  it("round-trips the draft and the save time", () => {
    const savedAt = new Date("2026-11-19T13:31:00Z");
    expect(parseDraft(serializeDraft(draft, savedAt))).toEqual({ draft, savedAt });
  });

  it("rejects broken, foreign or empty content", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("not json")).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 2, draft, savedAt: "2026-11-19T13:31:00Z" }))).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 1, draft: { ...draft, type: "other" }, savedAt: "2026-11-19T13:31:00Z" }))).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 1, draft: { ...draft, body: 3 }, savedAt: "x" }))).toBeNull();
  });
});

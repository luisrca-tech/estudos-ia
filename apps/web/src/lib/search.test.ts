import { describe, expect, it } from "vitest";

import { matchesQuery, normalizeSearch } from "./search";

describe("command palette search", () => {
  it("ignores case and accents", () => {
    expect(normalizeSearch("  Avaliação  ")).toBe("avaliacao");
    expect(matchesQuery("Módulo 6 · Avaliação", "avaliacao")).toBe(true);
    expect(matchesQuery("Módulo 6 · Avaliação", "MODULO 6")).toBe(true);
  });

  it("requires every word, in any order", () => {
    expect(matchesQuery("Recuperação: RAG de verdade", "rag recup")).toBe(true);
    expect(matchesQuery("Recuperação: RAG de verdade", "rag memoria")).toBe(false);
  });

  it("an empty query matches everything", () => {
    expect(matchesQuery("qualquer coisa", "   ")).toBe(true);
  });
});

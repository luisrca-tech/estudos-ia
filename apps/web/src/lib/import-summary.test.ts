import { describe, expect, it } from "vitest";

import { importOutcome, importSummary, resultLine } from "./import-summary";

const row = (overrides: Partial<Parameters<typeof importOutcome>[0]> = {}) => ({
  kicker: "Módulo 1 · Fundamentos",
  characters: 120,
  done: false,
  duplicate: false,
  currentMastery: 0,
  ...overrides,
});

describe("importOutcome", () => {
  it("creates one note per section with text", () => {
    expect(importOutcome(row())).toEqual({ notes: 1, label: "Cria 1 nota", creates: true, raises: false });
  });

  it("adds the step raise when the section is checked and the module is below 3", () => {
    expect(importOutcome(row({ done: true, currentMastery: 2 })).label).toBe("Cria 1 nota, degrau 3");
    expect(importOutcome(row({ done: true, currentMastery: 3 })).label).toBe("Cria 1 nota");
  });

  it("keeps the step raise of an already imported section", () => {
    expect(importOutcome(row({ duplicate: true, done: true, currentMastery: 1 }))).toMatchObject({
      label: "Já importada, degrau 3",
      creates: false,
      raises: true,
    });
  });

  it("ignores duplicates and empty sections", () => {
    expect(importOutcome(row({ duplicate: true }))).toMatchObject({ notes: 1, label: "Já importada, ignora", creates: false });
    expect(importOutcome(row({ characters: 0 }))).toMatchObject({ notes: 0, label: "Sem anotações, ignora", creates: false });
  });

  it("raises the step of an empty but checked section", () => {
    expect(importOutcome(row({ characters: 0, done: true, currentMastery: 1 }))).toMatchObject({
      label: "Sobe para o degrau 3",
      creates: false,
      raises: true,
    });
  });
});

describe("importSummary", () => {
  it("counts new notes, raised modules and ignored sections", () => {
    const rows = [
      row({ done: true, currentMastery: 2 }),
      row({ kicker: "No mundo real" }),
      row({ kicker: "Módulo 2 · Controle", duplicate: true }),
      row({ kicker: "Módulo 3 · Contexto", characters: 0 }),
      row({ kicker: "Módulo 6 · Avaliação", characters: 0, done: true, currentMastery: 4 }),
    ];
    expect(importSummary(rows)).toEqual({
      toCreate: 2,
      line: "2 notas novas · Módulo 1 sobe para o degrau 3 · 3 seções ignoradas, vazias ou já importadas.",
    });
  });

  it("joins several raised modules and omits empty parts", () => {
    const rows = [
      row({ characters: 0, done: true }),
      row({ kicker: "Módulo 4 · Recuperação", duplicate: true, done: true, currentMastery: 1 }),
    ];
    expect(importSummary(rows).line).toBe("Nenhuma nota nova · Módulos 1 e 4 sobem para o degrau 3.");
    expect(importSummary([row()]).line).toBe("1 nota nova.");
    expect(importSummary([row(), row({ characters: 0 })]).line).toBe("1 nota nova · 1 seção ignorada, vazia ou já importada.");
  });
});

describe("resultLine", () => {
  it("describes notes and the step change per module", () => {
    expect(resultLine({ created: 2, masteryBefore: 2, masteryAfter: 3 })).toBe("2 notas · degrau 2 → 3");
    expect(resultLine({ created: 1, masteryBefore: 3, masteryAfter: 3 })).toBe("1 nota");
    expect(resultLine({ created: 0, masteryBefore: 0, masteryAfter: 3 })).toBe("degrau 0 → 3");
  });
});

import { describe, expect, it } from "vitest";

import {
  ImportParseError,
  importNoteTitle,
  parseImport,
  planImport,
  type ImportModule,
} from "./import-parser";

// Synthetic fixtures only: the repository is public and must not contain real notes.
const modules: ImportModule[] = [
  { id: "id-m1", key: "m1", order: 1, kicker: "Módulo 1 · Fundamentos", title: "O que o modelo é e o que ele não é" },
  { id: "id-m2", key: "m2", order: 2, kicker: "Módulo 2 · Controle do trabalho", title: "Padrões de controle: quem decide o próximo passo" },
  { id: "id-m3", key: "m3", order: 3, kicker: "Módulo 3 · O que o modelo vê", title: "Contexto e memória" },
  { id: "id-casos", key: "casos", order: 15, kicker: "No mundo real", title: "Como as empresas aplicam estes conceitos" },
];

const header = (module: ImportModule, done = false) => `## ${module.kicker} · ${module.title}${done ? " ✓" : ""}`;

function exportFile(notes: Record<string, string>, done: string[] = []): string {
  let out = "# Trilha de Engenharia de Sistemas com IA · anotações\n\nExportado em 19/11/2026, 16:00:00\n";
  for (const module of modules) {
    out += `\n${header(module, done.includes(module.key))}\n\n${(notes[module.key] ?? "").trim() || "_(sem anotações)_"}\n`;
  }
  return out;
}

const now = new Date("2026-11-19T15:00:00-03:00");

describe("parseImport: markdown export (acceptance 12 and 14)", () => {
  it("reads notes in m1 and casos, ignores empty sections and keeps the ✓", () => {
    const parsed = parseImport(exportFile({ m1: "Nota sintética A", casos: "Caso sintético B" }, ["m1", "m2"]), modules);
    expect(parsed.format).toBe("markdown");
    expect(parsed.warnings).toEqual([]);
    expect(parsed.sections).toEqual([
      { moduleKey: "m1", body: "Nota sintética A", done: true },
      { moduleKey: "m2", body: "", done: true },
      { moduleKey: "m3", body: "", done: false },
      { moduleKey: "casos", body: "Caso sintético B", done: false },
    ]);
  });

  it("does not split a note on its own '## Minha seção' heading", () => {
    const body = "Primeira parte\n\n## Minha seção\n\nSegunda parte\n\n### Detalhe\n- item";
    const parsed = parseImport(exportFile({ m1: body, m2: "Outra nota" }), modules);
    expect(parsed.sections.find((section) => section.moduleKey === "m1")?.body).toBe(body);
    expect(parsed.sections.find((section) => section.moduleKey === "m2")?.body).toBe("Outra nota");
    expect(parsed.warnings).toEqual([]);
  });

  it("normalizes CRLF and ignores the title and 'Exportado em' preamble", () => {
    const parsed = parseImport(exportFile({ m1: "Linha 1\nLinha 2" }).replace(/\n/g, "\r\n"), modules);
    expect(parsed.sections.find((section) => section.moduleKey === "m1")?.body).toBe("Linha 1\nLinha 2");
    expect(parsed.sections.some((section) => section.body.includes("Exportado em"))).toBe(false);
  });

  it("warns about an unmapped export header instead of failing or merging it", () => {
    const text = `${exportFile({ m1: "Nota A" })}\n## Módulo 99 · Inexistente · Título qualquer\n\nTexto órfão\n`;
    const parsed = parseImport(text, modules);
    expect(parsed.warnings).toHaveLength(1);
    expect(parsed.warnings[0]).toContain("seção não mapeada");
    expect(parsed.warnings[0]).toContain("Módulo 99");
    expect(parsed.sections.some((section) => section.body.includes("Texto órfão"))).toBe(false);
    expect(parsed.sections.find((section) => section.moduleKey === "m1")?.body).toBe("Nota A");
  });

  it("requires an exact header match: other '## ' lines are body text", () => {
    const text = exportFile({ m1: `Antes\n\n## ${modules[1]!.title}\n\nDepois` });
    const parsed = parseImport(text, modules);
    expect(parsed.sections.find((section) => section.moduleKey === "m1")?.body).toBe(
      `Antes\n\n## ${modules[1]!.title}\n\nDepois`,
    );
    expect(parsed.warnings).toEqual([]);
  });

  it("warns when a known kicker comes with a title that no longer matches", () => {
    const text = exportFile({ m1: "Nota A" }).replace(header(modules[1]!), `## ${modules[1]!.kicker} · Título antigo`).replace("_(sem anotações)_", "Nota do título antigo");
    const parsed = parseImport(text, modules);
    expect(parsed.warnings).toHaveLength(1);
    expect(parsed.warnings[0]).toContain("Título antigo");
    expect(parsed.sections.find((section) => section.moduleKey === "m1")?.body).toBe("Nota A");
    expect(parsed.sections.some((section) => section.moduleKey === "m2")).toBe(false);
  });
});

describe("parseImport: JSON alternative (acceptance 15)", () => {
  it("accepts the console snippet shape { notes, done }", () => {
    const text = JSON.stringify({
      notes: { m1: "Nota JSON A", m3: "   ", casos: "Caso JSON B", m99: "sem módulo" },
      done: { m1: true, m2: true, m3: false },
    });
    const parsed = parseImport(text, modules);
    expect(parsed.format).toBe("json");
    expect(parsed.sections).toEqual([
      { moduleKey: "m1", body: "Nota JSON A", done: true },
      { moduleKey: "m2", body: "", done: true },
      { moduleKey: "m3", body: "", done: false },
      { moduleKey: "casos", body: "Caso JSON B", done: false },
    ]);
    expect(parsed.warnings).toEqual(['chave "m99" não corresponde a nenhum módulo']);
  });

  it("accepts the flat shape { [key]: string }", () => {
    const parsed = parseImport('{ "m2": "Nota plana", "outro": "x" }', modules);
    expect(parsed.sections.filter((section) => section.body)).toEqual([{ moduleKey: "m2", body: "Nota plana", done: false }]);
    expect(parsed.warnings).toHaveLength(1);
  });

  it("rejects invalid JSON and non-string notes", () => {
    expect(() => parseImport("{ not json", modules)).toThrow(ImportParseError);
    expect(() => parseImport('{ "m1": 3 }', modules)).toThrow(ImportParseError);
    expect(() => parseImport("[1, 2]", modules)).toThrow(ImportParseError);
  });
});

describe("planImport (acceptance 12, 13 and staggering)", () => {
  it("creates one note per non-empty section and raises mastery for ✓ modules", () => {
    const parsed = parseImport(exportFile({ m1: "Nota A", casos: "Caso B" }, ["m1", "m2"]), modules);
    const plan = planImport(parsed, modules, [], now);
    expect(plan.create).toEqual([
      { moduleId: "id-m1", moduleKey: "m1", body: "Nota A", dueOn: "2026-11-20" },
      { moduleId: "id-casos", moduleKey: "casos", body: "Caso B", dueOn: "2026-11-20" },
    ]);
    expect(plan.skipped).toEqual([]);
    expect(plan.masteryModuleIds).toEqual(["id-m1", "id-m2"]);
  });

  it("importing the same file again creates nothing and skips everything", () => {
    const parsed = parseImport(exportFile({ m1: "Nota A", casos: "Caso B" }, ["m1"]), modules);
    const existing = [
      { moduleId: "id-m1", body: "  Nota A\n" },
      { moduleId: "id-casos", body: "Caso B" },
    ];
    const plan = planImport(parsed, modules, existing, now);
    expect(plan.create).toEqual([]);
    expect(plan.skipped.map((entry) => entry.moduleKey)).toEqual(["m1", "casos"]);
  });

  it("a duplicate is per module: the same body in another module is still created", () => {
    const parsed = parseImport(exportFile({ m1: "Igual", m2: "Igual" }), modules);
    const plan = planImport(parsed, modules, [{ moduleId: "id-m1", body: "Igual" }], now);
    expect(plan.create.map((entry) => entry.moduleKey)).toEqual(["m2"]);
    expect(plan.skipped.map((entry) => entry.moduleKey)).toEqual(["m1"]);
  });

  it("staggers 15 imported notes at 3 per day in module order", () => {
    const many: ImportModule[] = Array.from({ length: 15 }, (_, index) => ({
      id: `id-${index + 1}`,
      key: `m${index + 1}`,
      order: index + 1,
      kicker: `Módulo ${index + 1} · Tema`,
      title: `Título ${index + 1}`,
    }));
    // Keys deliberately out of order: the plan must follow module order, not file order.
    const notes = Object.fromEntries([...many].reverse().map((module) => [module.key, `Nota ${module.key}`]));
    const plan = planImport(parseImport(JSON.stringify(notes), many), many, [], now);
    expect(plan.create).toHaveLength(15);
    expect(plan.create.map((entry) => entry.moduleKey)).toEqual(many.map((module) => module.key));
    const perDay = new Map<string, number>();
    for (const entry of plan.create) perDay.set(entry.dueOn, (perDay.get(entry.dueOn) ?? 0) + 1);
    expect([...perDay.entries()]).toEqual([
      ["2026-11-20", 3],
      ["2026-11-21", 3],
      ["2026-11-22", 3],
      ["2026-11-23", 3],
      ["2026-11-24", 3],
    ]);
  });

  it("skipped duplicates do not consume staggering slots", () => {
    const parsed = parseImport(exportFile({ m1: "A", m2: "B", m3: "C", casos: "D" }), modules);
    const plan = planImport(parsed, modules, [{ moduleId: "id-m1", body: "A" }], now);
    expect(plan.create.map((entry) => entry.dueOn)).toEqual(["2026-11-20", "2026-11-20", "2026-11-20"]);
  });
});

describe("importNoteTitle", () => {
  it("uses the São Paulo date", () => {
    expect(importNoteTitle(new Date("2026-11-20T01:00:00Z"))).toBe("Anotações do HTML (importadas em 19/11/2026)");
  });
});

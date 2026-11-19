import { describe, expect, it } from "vitest";

import { templateBody, templateProgress, TEMPLATE_SECTIONS } from "./note-template";

describe("note template", () => {
  it("has the concept note sections for summaries and the ADR sections for decisions", () => {
    expect(TEMPLATE_SECTIONS.summary).toEqual([
      "Afirmação",
      "Mecanismo",
      "Use quando",
      "Não use quando",
      "Alternativa mais simples",
      "Evidência",
      "Como eu verificaria",
      "Pergunta de revisão",
    ]);
    expect(TEMPLATE_SECTIONS.decision).toEqual([
      "Contexto",
      "Opções consideradas",
      "Escolha",
      "Evidência",
      "Custo aceito",
      "O que me faria mudar de ideia",
      "Data",
    ]);
  });

  it("has no template for questions and evidence", () => {
    expect(templateProgress("question", "x")).toBeNull();
    expect(templateProgress("evidence", "x")).toBeNull();
    expect(templateBody("question")).toBeNull();
  });

  it("the empty template counts nothing as written", () => {
    const progress = templateProgress("summary", templateBody("summary")!);
    expect(progress?.every((section) => !section.written)).toBe(true);
    expect(templateBody("summary")).toContain("**Afirmação:** …");
  });

  it("marks bold headings with text as written, in either '**X:**' or '**X**:' form", () => {
    const body = "**Afirmação:** uma ideia\n\n**Mecanismo**: porque sim\n\n**Use quando:** …\n\n**Evidência:**";
    const written = templateProgress("summary", body)?.filter((section) => section.written).map((section) => section.name);
    expect(written).toEqual(["Afirmação", "Mecanismo"]);
  });

  it("accepts plain 'X:' headings and text on the following lines", () => {
    const body = "Contexto:\n\nO agente confirmava no evento errado.\n\nEscolha: o código injeta o ID\n\nData: …";
    const written = templateProgress("decision", body)?.filter((section) => section.written).map((section) => section.name);
    expect(written).toEqual(["Contexto", "Escolha"]);
  });

  it("does not confuse 'Use quando' with 'Não use quando'", () => {
    const written = templateProgress("summary", "**Não use quando:** exploração livre")
      ?.filter((section) => section.written)
      .map((section) => section.name);
    expect(written).toEqual(["Não use quando"]);
  });
});

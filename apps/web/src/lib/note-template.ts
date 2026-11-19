/** Template guide of the editor: which sections of the note model already have text. */

export const TEMPLATE_SECTIONS = {
  summary: [
    "Afirmação",
    "Mecanismo",
    "Use quando",
    "Não use quando",
    "Alternativa mais simples",
    "Evidência",
    "Como eu verificaria",
    "Pergunta de revisão",
  ],
  decision: ["Contexto", "Opções consideradas", "Escolha", "Evidência", "Custo aceito", "O que me faria mudar de ideia", "Data"],
} as const;

type TemplateType = keyof typeof TEMPLATE_SECTIONS;
const PLACEHOLDER = /^[.…\s]*$/;

function hasTemplate(type: string): type is TemplateType {
  return type in TEMPLATE_SECTIONS;
}

export function templateBody(type: string): string | null {
  if (!hasTemplate(type)) return null;
  return TEMPLATE_SECTIONS[type].map((name) => `**${name}:** …`).join("\n\n");
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Heading at the start of a line: "**X:**", "**X**:" or "X:". */
function headingPattern(name: string): RegExp {
  return new RegExp(`^\\s*(?:\\*\\*${escape(name)}:?\\*\\*:?|${escape(name)}:)\\s*(.*)$`, "i");
}

export function templateProgress(type: string, body: string): Array<{ name: string; written: boolean }> | null {
  if (!hasTemplate(type)) return null;
  const names = TEMPLATE_SECTIONS[type];
  const patterns = names.map(headingPattern);
  const content = new Map<string, string[]>();
  let current: string | null = null;

  for (const line of body.split("\n")) {
    const index = patterns.findIndex((pattern) => pattern.test(line));
    if (index >= 0) {
      current = names[index]!;
      content.set(current, [line.match(patterns[index]!)?.[1] ?? ""]);
    } else if (current) {
      content.get(current)!.push(line);
    }
  }

  return names.map((name) => {
    const text = (content.get(name) ?? []).join("\n").trim();
    return { name, written: text.length > 0 && !PLACEHOLDER.test(text) };
  });
}

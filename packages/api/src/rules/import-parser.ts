import { staggeredDueDates } from "./review";
import { formatDayMonthYear, type CalendarDay } from "./time";

export const EMPTY_NOTE_MARKER = "_(sem anotações)_";
const DONE_SUFFIX = " ✓";

export type ImportModule = {
  id: string;
  key: string;
  order: number;
  kicker: string;
  title: string;
};

export type ImportSection = {
  moduleKey: string;
  /** Trimmed note text; empty when the module had no notes. */
  body: string;
  /** The "Cheguei ao degrau 3" box was checked in the HTML. */
  done: boolean;
};

export type ParsedImport = {
  format: "markdown" | "json";
  sections: ImportSection[];
  warnings: string[];
};

export class ImportParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportParseError";
  }
}

function sortByModuleOrder(sections: ImportSection[], modules: ImportModule[]): ImportSection[] {
  const order = new Map(modules.map((module) => [module.key, module.order]));
  return sections.sort((a, b) => (order.get(a.moduleKey) ?? 0) - (order.get(b.moduleKey) ?? 0));
}

/**
 * Markdown produced by the "Exportar anotações" button of the track HTML.
 *
 * A line opens a section only when it is EXACTLY "## {kicker} · {title}"
 * (optionally followed by " ✓") of a known module, so headings written inside
 * a note stay in its body. A "## " line that still looks like an export header
 * (before the first known header, a known kicker with another title, or the
 * "Módulo N · " pattern) is reported as "seção não mapeada" and its text is
 * dropped instead of being merged into the previous module.
 */
function parseMarkdown(text: string, modules: ImportModule[]): ParsedImport {
  const headers = new Map<string, { key: string; done: boolean }>();
  for (const module of modules) {
    const header = `## ${module.kicker} · ${module.title}`;
    headers.set(header, { key: module.key, done: false });
    headers.set(`${header}${DONE_SUFFIX}`, { key: module.key, done: true });
  }
  const kickerPrefixes = modules.map((module) => `## ${module.kicker} · `);
  const looksLikeExportHeader = (line: string, insideSection: boolean) =>
    line.startsWith("## ") &&
    (!insideSection ||
      /^## Módulo \d+ · /.test(line) ||
      kickerPrefixes.some((prefix) => line.startsWith(prefix)));

  const collected = new Map<string, { lines: string[]; done: boolean }>();
  const warnings: string[] = [];
  let current: { lines: string[]; done: boolean } | null = null;
  let insideUnmapped = false;

  for (const line of text.split("\n")) {
    const header = headers.get(line.trimEnd());
    if (header) {
      insideUnmapped = false;
      const existing = collected.get(header.key);
      if (existing) {
        existing.lines.push("");
        existing.done ||= header.done;
        current = existing;
      } else {
        current = { lines: [], done: header.done };
        collected.set(header.key, current);
      }
      continue;
    }
    if (looksLikeExportHeader(line, current !== null || insideUnmapped)) {
      warnings.push(`seção não mapeada: "${line.slice(3).trim()}"`);
      current = null;
      insideUnmapped = true;
      continue;
    }
    current?.lines.push(line);
  }

  const sections = [...collected.entries()].map(([moduleKey, section]) => {
    const body = section.lines.join("\n").trim();
    return { moduleKey, body: body === EMPTY_NOTE_MARKER ? "" : body, done: section.done };
  });
  return { format: "markdown", sections: sortByModuleOrder(sections, modules), warnings };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `{ [key]: string }` or `{ notes: { [key]: string }, done?: { [key]: boolean } }`. */
function parseJson(text: string, modules: ImportModule[]): ParsedImport {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ImportParseError("O arquivo não é um JSON válido.");
  }
  if (!isRecord(json)) {
    throw new ImportParseError("O JSON deve ser um objeto com as chaves dos módulos.");
  }

  const wrapped = isRecord(json.notes);
  const notes = wrapped ? (json.notes as Record<string, unknown>) : json;
  const done = wrapped && isRecord(json.done) ? json.done : {};
  const known = new Set(modules.map((module) => module.key));
  const warnings: string[] = [];
  const sections = new Map<string, ImportSection>();

  for (const [key, value] of Object.entries(notes)) {
    if (typeof value !== "string") {
      throw new ImportParseError(`A anotação da chave "${key}" deve ser um texto.`);
    }
    if (!known.has(key)) {
      warnings.push(`chave "${key}" não corresponde a nenhum módulo`);
      continue;
    }
    sections.set(key, { moduleKey: key, body: value.replace(/\r\n/g, "\n").trim(), done: false });
  }
  for (const [key, value] of Object.entries(done)) {
    if (!known.has(key)) continue; // e.g. "metodo": a checkbox without a module
    const section = sections.get(key) ?? { moduleKey: key, body: "", done: false };
    section.done = value === true;
    sections.set(key, section);
  }

  return { format: "json", sections: sortByModuleOrder([...sections.values()], modules), warnings };
}

/** `modules` must include archived modules: their notes still belong to the user. */
export function parseImport(rawText: string, modules: ImportModule[]): ParsedImport {
  const text = rawText.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  return text.trimStart().startsWith("{") || text.trimStart().startsWith("[")
    ? parseJson(text, modules)
    : parseMarkdown(text, modules);
}

export type ImportPlan = {
  create: Array<{ moduleId: string; moduleKey: string; body: string; dueOn: CalendarDay }>;
  skipped: Array<{ moduleId: string; moduleKey: string }>;
  /** Modules whose "degrau 3" box was checked: mastery becomes max(current, 3). */
  masteryModuleIds: string[];
};

/**
 * Decides what an import writes. Idempotent: a section whose trimmed body
 * already exists as an imported note of the same module is skipped.
 */
export function planImport(
  parsed: ParsedImport,
  modules: ImportModule[],
  existingImportedNotes: Array<{ moduleId: string; body: string }>,
  now: Date,
): ImportPlan {
  const moduleByKey = new Map(modules.map((module) => [module.key, module]));
  const existing = new Set(existingImportedNotes.map((note) => `${note.moduleId}\n${note.body.trim()}`));
  const plan: ImportPlan = { create: [], skipped: [], masteryModuleIds: [] };
  const pending: Array<{ moduleId: string; moduleKey: string; body: string }> = [];

  for (const section of sortByModuleOrder([...parsed.sections], modules)) {
    const module = moduleByKey.get(section.moduleKey);
    if (!module) continue;
    if (section.done) plan.masteryModuleIds.push(module.id);
    if (!section.body) continue;
    if (existing.has(`${module.id}\n${section.body}`)) {
      plan.skipped.push({ moduleId: module.id, moduleKey: module.key });
    } else {
      pending.push({ moduleId: module.id, moduleKey: module.key, body: section.body });
    }
  }

  const dueDates = staggeredDueDates(pending.length, now);
  plan.create = pending.map((entry, index) => ({ ...entry, dueOn: dueDates[index]! }));
  return plan;
}

export function importNoteTitle(now: Date): string {
  return `Anotações do HTML (importadas em ${formatDayMonthYear(now)})`;
}

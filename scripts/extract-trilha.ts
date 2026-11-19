/**
 * One-time extraction of the study track HTML into versioned JSON content.
 *
 * Usage: npm run content:extract -- "<path-to-html>"
 *
 * The HTML is read-only input and never enters the repository. After the first
 * run the JSON files are the source of truth; re-run only if the HTML is rewritten.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import TurndownService from "turndown";

import {
  moduleContentSchema,
  routinesFileSchema,
  type ModuleContent,
  type Reading,
  type RoutinesFile,
} from "../packages/db/src/content/schema";

const SLUG_BY_KEY: Record<string, string> = {
  m1: "m01-fundamentos",
  m2: "m02-controle",
  m3: "m03-contexto-memoria",
  m4: "m04-recuperacao",
  m5: "m05-ferramentas-aci",
  m6: "m06-avaliacao",
  m7: "m07-harness",
  m8: "m08-seguranca",
  m9: "m09-observabilidade",
  m10: "m10-economia-escala",
  m11: "m11-adaptacao-dados",
  m12: "m12-inferencia-latencia",
  m13: "m13-produto-feedback",
  m14: "m14-governanca",
  casos: "casos-mundo-real",
};

const MODULE_KEYS = Object.keys(SLUG_BY_KEY);
const GRADE_B_KINDS = new Set(["Paper", "Pesquisa"]);

// Labels follow spec section 4.4; hints come from the "Tempo" column of the method table.
const ROUTINES: Array<{ slug: string; cadence: "daily" | "weekly" | "monthly"; label: string }> = [
  { slug: "daily-recall", cadence: "daily", label: "Responder de cabeça 3 perguntas de revisão (5 min)" },
  { slug: "daily-read-one", cadence: "daily", label: "Ler ou assistir **uma** seção de uma fonte (15–20 min)" },
  { slug: "daily-concept-note", cadence: "daily", label: "Fechar a fonte e escrever uma nota de conceito (10–15 min)" },
  { slug: "weekly-exercise", cadence: "weekly", label: "Um exercício prático do módulo da semana num projeto real" },
  { slug: "weekly-decision", cadence: "weekly", label: "Uma ficha de decisão sobre algo que você escolheu ou vai escolher" },
  { slug: "weekly-prune", cadence: "weekly", label: "Rever as notas e cortar o que não usaria" },
  { slug: "monthly-synthesis", cadence: "monthly", label: "Escrever um texto de síntese" },
  { slug: "monthly-blind-review", cadence: "monthly", label: "Pedir uma revisão cega a um agente" },
  { slug: "monthly-playbook", cadence: "monthly", label: 'Atualizar o guia "por onde começar" com o que aprendeu' },
];
const RHYTHM_BY_CADENCE = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" } as const;

const turndown = new TurndownService({
  emDelimiter: "_",
  strongDelimiter: "**",
  bulletListMarker: "-",
});

// In-page anchors: module anchors become app routes, any other anchor keeps only its text.
turndown.addRule("internal-anchor", {
  filter: (node) => node.nodeName === "A" && (node.getAttribute("href") ?? "").startsWith("#"),
  replacement: (content, node) => {
    const key = ((node as { getAttribute(name: string): string | null }).getAttribute("href") ?? "").slice(1);
    const slug = SLUG_BY_KEY[key];
    return slug ? `[${content}](/modules/${slug})` : content;
  },
});

function fail(message: string): never {
  console.error(`extract-trilha: ${message}`);
  process.exit(1);
}

function md(html: string | null | undefined): string {
  return turndown
    .turndown(html ?? "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function mdOrNull(html: string | null | undefined): string | null {
  const text = md(html);
  return text.length > 0 ? text : null;
}

const htmlPath = process.argv[2];
if (!htmlPath) fail("missing HTML path. Usage: npm run content:extract -- <path-to-html>");

const $ = cheerio.load(readFileSync(htmlPath, "utf8"));

function listItems(section: cheerio.Cheerio<AnyNode>, selector: string): string[] {
  return section
    .find(selector)
    .map((_, li) => md($(li).html()))
    .get()
    .filter((item) => item.length > 0);
}

function extractReading(li: AnyNode): Reading {
  const item = $(li);
  const kind = item.children("span.t").first().text().trim();
  const body = item.children("div").first();
  const url = body.find("a[href]").first().attr("href");
  if (!url) fail(`reading without link: ${item.text().slice(0, 80)}`);
  const duration = body.find(".mins").first().text().replace(/^·\s*/, "").trim();
  const why = body.find(".why").first().text().trim();
  const titleNode = body.clone();
  titleNode.find(".mins, .why").remove();
  return {
    kind,
    title: md(titleNode.html()),
    url,
    duration: duration || null,
    why: why || null,
    grade: GRADE_B_KINDS.has(kind) ? "B" : null,
  };
}

// Rows of the company cases table. The HTML states every case is grade C evidence.
function extractCaseRow(tr: AnyNode): Reading {
  const cells = $(tr).children("td");
  if (cells.length !== 4) fail("unexpected cases table shape");
  const [name, modules, what, source] = cells.toArray().map((cell) => $(cell));
  const url = source!.find("a[href]").first().attr("href");
  if (!url) fail(`case without link: ${name!.text()}`);
  return {
    kind: "Caso",
    title: `${md(name!.html())} (${md(source!.html())})`,
    url,
    duration: null,
    why: `${md(what!.html())} Módulos: ${modules!.text().trim()}.`,
    grade: "C",
  };
}

function extractModule(key: string, index: number): ModuleContent {
  const section = $(`section#${key}`);
  if (section.length !== 1) fail(`section #${key} not found`);
  if (section.find("[data-note]").attr("data-note") !== key) fail(`#${key}: data-note mismatch`);

  const isCases = key === "casos";
  const exercise = section.find(".ex").first().clone();
  exercise.children("b").first().remove();

  const readings = section
    .find("ul.src > li")
    .map((_, li) => extractReading(li))
    .get();
  if (isCases) {
    readings.push(
      ...section
        .find(".tbl tbody tr")
        .map((_, tr) => extractCaseRow(tr))
        .get(),
    );
  }

  const seed = section.find(".box.seed").first().clone();
  seed.children("b").first().remove();

  return {
    schemaVersion: 1,
    slug: SLUG_BY_KEY[key]!,
    key,
    part: index < 10 ? 1 : 2,
    order: index + 1,
    kicker: section.children("p.kicker").first().text().trim(),
    title: section.children("h2").first().text().trim(),
    lead: mdOrNull(section.children("p.lead").first().html()),
    prerequisites: mdOrNull(section.children("p.pre").first().html()),
    seen: listItems(section, ".box.seen li"),
    new: listItems(section, ".box.new li"),
    decisionQuestions: isCases ? listItems(section, ".ex ol > li") : listItems(section, ".box.q li"),
    readings,
    exercise: isCases ? null : mdOrNull(exercise.html()),
    seeds: mdOrNull(seed.html()),
  };
}

function extractRoutines(): RoutinesFile {
  const hintByRhythm = new Map<string, string>();
  $("section#metodo .tbl tbody tr").each((_, tr) => {
    const cells = $(tr).children("td");
    hintByRhythm.set(cells.eq(0).text().trim(), cells.eq(1).text().trim());
  });
  const orderByCadence = new Map<string, number>();
  return {
    schemaVersion: 1,
    items: ROUTINES.map((routine) => {
      const hint = hintByRhythm.get(RHYTHM_BY_CADENCE[routine.cadence]);
      if (!hint) fail(`routine rhythm "${RHYTHM_BY_CADENCE[routine.cadence]}" not found in #metodo`);
      const order = (orderByCadence.get(routine.cadence) ?? 0) + 1;
      orderByCadence.set(routine.cadence, order);
      return { slug: routine.slug, cadence: routine.cadence, order, label: routine.label, hint };
    }),
  };
}

const modules = MODULE_KEYS.map((key, index) => moduleContentSchema.parse(extractModule(key, index)));
const routines = routinesFileSchema.parse(extractRoutines());

// Mandatory count checks (spec 4.1).
if (modules.length !== 15) fail(`expected 15 modules, got ${modules.length}`);
if ($("textarea[data-note]").length !== 15) fail("expected 15 note textareas in the HTML");
const numbered = modules.filter((module) => module.key !== "casos");
for (const box of ["q", "seen", "new", "seed"] as const) {
  const count = numbered.filter((module) => $(`section#${module.key} .box.${box}`).length === 1).length;
  if (count !== 14) fail(`expected 14 modules with .box.${box}, got ${count}`);
}
for (const module of numbered) {
  const empty = (["seen", "new", "decisionQuestions", "readings"] as const).filter(
    (field) => module[field].length === 0,
  );
  if (empty.length > 0 || !module.seeds || !module.exercise || !module.lead) {
    fail(`${module.key}: empty fields ${[...empty, !module.seeds && "seeds", !module.exercise && "exercise", !module.lead && "lead"].filter(Boolean).join(", ")}`);
  }
  if ((module.prerequisites !== null) !== (module.part === 2)) {
    fail(`${module.key}: prerequisites expected only in part 2`);
  }
}
const cases = modules.at(-1)!;
if (cases.decisionQuestions.length !== 5 || cases.readings.length !== 10) {
  fail(`casos: expected 5 questions and 10 readings, got ${cases.decisionQuestions.length} and ${cases.readings.length}`);
}
if (routines.items.length !== 9) fail(`expected 9 routine items, got ${routines.items.length}`);

const contentDir = join(dirname(fileURLToPath(import.meta.url)), "..", "content");
mkdirSync(join(contentDir, "modules"), { recursive: true });
for (const module of modules) {
  writeFileSync(join(contentDir, "modules", `${module.slug}.json`), `${JSON.stringify(module, null, 2)}\n`);
}
writeFileSync(join(contentDir, "routines.json"), `${JSON.stringify(routines, null, 2)}\n`);

const readingCount = modules.reduce((sum, module) => sum + module.readings.length, 0);
console.log(`extract-trilha: wrote ${modules.length} modules (${readingCount} readings) and ${routines.items.length} routine items`);

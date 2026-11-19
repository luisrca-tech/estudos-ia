/** Passages that changed since the version of the module the user last saw. */

type ReadingLike = { url: string; title: string };

export type DiffContent = {
  lead: string | null;
  seen: string[];
  new: string[];
  decisionQuestions: string[];
  readings: ReadingLike[];
  exercise: string | null;
  seeds: string | null;
};

type ListField = "seen" | "new" | "decisionQuestions" | "readings";

export type ModuleDiff = {
  isChanged: (field: ListField, item: string) => boolean;
  lead: boolean;
  exercise: boolean;
  seeds: boolean;
  added: Record<ListField, number>;
  count: number;
};

export function changedPassages(previous: DiffContent | null, current: DiffContent): ModuleDiff {
  const changed: Record<ListField, Set<string>> = {
    seen: new Set(),
    new: new Set(),
    decisionQuestions: new Set(),
    readings: new Set(),
  };
  if (!previous) {
    return { isChanged: () => false, lead: false, exercise: false, seeds: false, added: { seen: 0, new: 0, decisionQuestions: 0, readings: 0 }, count: 0 };
  }

  for (const field of ["seen", "new", "decisionQuestions"] as const) {
    const before = new Set(previous[field]);
    for (const item of current[field]) if (!before.has(item)) changed[field].add(item);
  }
  const readingsBefore = new Set(previous.readings.map((reading) => `${reading.url}\n${reading.title}`));
  for (const reading of current.readings) {
    if (!readingsBefore.has(`${reading.url}\n${reading.title}`)) changed.readings.add(reading.url);
  }

  const lead = (previous.lead ?? "") !== (current.lead ?? "");
  const exercise = (previous.exercise ?? "") !== (current.exercise ?? "");
  const seeds = (previous.seeds ?? "") !== (current.seeds ?? "");
  const added = {
    seen: changed.seen.size,
    new: changed.new.size,
    decisionQuestions: changed.decisionQuestions.size,
    readings: changed.readings.size,
  };
  const count = added.seen + added.new + added.decisionQuestions + added.readings + [lead, exercise, seeds].filter(Boolean).length;

  return { isChanged: (field, item) => changed[field].has(item), lead, exercise, seeds, added, count };
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function describeChanges(diff: ModuleDiff): string {
  const parts: string[] = [];
  if (diff.added.readings) parts.push(plural(diff.added.readings, "leitura nova", "leituras novas"));
  if (diff.added.new) parts.push(plural(diff.added.new, "item novo", "itens novos"));
  if (diff.added.decisionQuestions) parts.push(plural(diff.added.decisionQuestions, "pergunta nova", "perguntas novas"));
  if (diff.added.seen) parts.push(plural(diff.added.seen, "item revisto em já visto", "itens revistos em já visto"));
  if (diff.lead) parts.push("abertura reescrita");
  if (diff.exercise) parts.push("exercício reescrito");
  if (diff.seeds) parts.push("semente reescrita");
  if (parts.length === 0) return "Mudanças de texto pequenas.";
  const sentence = parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(", ")} e ${parts.at(-1)}`;
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

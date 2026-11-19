/** Preview and result copy of the import screen (board Importar). */

const DONE_LEVEL = 3;

type PreviewRow = {
  kicker: string;
  characters: number;
  done: boolean;
  duplicate: boolean;
  currentMastery: number;
};

/** One note per section with text; a checked section lifts the module to step 3. */
export function importOutcome(row: PreviewRow): { notes: number; label: string; creates: boolean; raises: boolean } {
  const notes = row.characters > 0 ? 1 : 0;
  const raises = row.done && row.currentMastery < DONE_LEVEL;
  if (notes === 0) {
    return raises
      ? { notes, label: "Sobe para o degrau 3", creates: false, raises }
      : { notes, label: "Sem anotações, ignora", creates: false, raises };
  }
  if (row.duplicate) return { notes, label: raises ? "Já importada, degrau 3" : "Já importada, ignora", creates: false, raises };
  return { notes, label: raises ? "Cria 1 nota, degrau 3" : "Cria 1 nota", creates: true, raises };
}

function joinPt(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`;
}

function raisedModules(kickers: string[]): string {
  const numbers = kickers.map((kicker) => kicker.match(/^Módulo (\d+)/)?.[1]);
  if (numbers.every(Boolean)) {
    return numbers.length === 1
      ? `Módulo ${numbers[0]} sobe para o degrau 3`
      : `Módulos ${joinPt(numbers as string[])} sobem para o degrau 3`;
  }
  const names = kickers.map((kicker) => kicker.split(" · ")[0]!);
  return `${joinPt(names)} ${names.length === 1 ? "sobe" : "sobem"} para o degrau 3`;
}

export function importSummary(rows: PreviewRow[]): { toCreate: number; line: string } {
  const outcomes = rows.map((row) => ({ row, outcome: importOutcome(row) }));
  const toCreate = outcomes.filter(({ outcome }) => outcome.creates).length;
  const raised = outcomes.filter(({ outcome }) => outcome.raises).map(({ row }) => row.kicker);
  const ignored = outcomes.filter(({ outcome }) => !outcome.creates && !outcome.raises).length;

  const parts = [toCreate === 0 ? "Nenhuma nota nova" : toCreate === 1 ? "1 nota nova" : `${toCreate} notas novas`];
  if (raised.length > 0) parts.push(raisedModules(raised));
  if (ignored > 0) {
    parts.push(ignored === 1 ? "1 seção ignorada, vazia ou já importada" : `${ignored} seções ignoradas, vazias ou já importadas`);
  }
  return { toCreate, line: `${parts.join(" · ")}.` };
}

export function resultLine(module: { created: number; masteryBefore: number; masteryAfter: number }): string {
  const parts: string[] = [];
  if (module.created > 0) parts.push(module.created === 1 ? "1 nota" : `${module.created} notas`);
  if (module.masteryAfter !== module.masteryBefore) parts.push(`degrau ${module.masteryBefore} → ${module.masteryAfter}`);
  return parts.join(" · ");
}

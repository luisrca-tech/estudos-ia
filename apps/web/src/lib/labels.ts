import type { RouterOutputs } from "@/utils/trpc";

export type NoteType = RouterOutputs["notes"]["byId"]["type"];
export type Grade = "A" | "B" | "C" | "D" | "E";

export const NOTE_TYPES: ReadonlyArray<{ value: NoteType; label: string; plural: string }> = [
  { value: "summary", label: "Resumo", plural: "Resumos" },
  { value: "question", label: "Pergunta", plural: "Perguntas" },
  { value: "decision", label: "Decisão", plural: "Decisões" },
  { value: "evidence", label: "Evidência", plural: "Evidências" },
];

export function noteTypeLabel(type: NoteType): string {
  return NOTE_TYPES.find((entry) => entry.value === type)?.label ?? type;
}

export function isNoteType(value: string | undefined): value is NoteType {
  return NOTE_TYPES.some((entry) => entry.value === value);
}

/** The mastery ladder of the method, steps 1 to 5. */
export const LADDER_LABELS = ["Reconheço", "Explico", "Decido", "Apliquei e medi", "Defendo e ensino"] as const;

export const LADDER_DESCRIPTIONS = [
  "Sei o que o termo significa quando aparece.",
  "Explico com minhas palavras e com um exemplo meu, sem olhar a fonte.",
  "Sei quando usar, quando não usar e qual é a alternativa mais simples.",
  "Usei num projeto e tenho um número comparado com uma baseline.",
  "Argumento com evidência graduada e reconheço o que me faria mudar de ideia.",
] as const;

export function ladderLabel(level: number): string {
  return level === 0 ? "Ainda não comecei" : `Degrau ${level}: ${LADDER_LABELS[level - 1]}`;
}

/** Evidence grades of the method. */
export const GRADES: ReadonlyArray<{ value: Grade; meaning: string }> = [
  { value: "A", meaning: "medi no meu sistema, com baseline" },
  { value: "B", meaning: "paper ou benchmark reproduzível" },
  { value: "C", meaning: "relato de engenharia de uma empresa" },
  { value: "D", meaning: "opinião de praticante experiente" },
  { value: "E", meaning: "intuição minha ou do agente" },
];

export const BODY_PLACEHOLDERS: Record<NoteType, string> = {
  summary: "Escreva de memória: a afirmação, o mecanismo, quando usar e quando não usar.",
  decision: "O contexto, as opções, a escolha e o custo aceito.",
  question: "O que você ainda não sabe responder? Escreva a pergunta no título e, aqui, o que já sabe e onde procurar.",
  evidence: "O que a fonte afirma, como eles sabem e o que isso muda no seu sistema.",
};

export const SESSION_PRESETS = [15, 25, 45] as const;
export const DEFAULT_SESSION_MINUTES = 25;
export const MIN_SESSION_MINUTES = 5;
export const MAX_SESSION_MINUTES = 180;

export const DB_HINT = "Confira se o Docker está aberto e o banco de pé (npm run db:start).";

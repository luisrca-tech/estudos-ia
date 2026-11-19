/** Note drafts autosaved in localStorage, one per note or per new note context. */

const PREFIX = "estudos-ia:draft:";
const VERSION = 1;
const NOTE_TYPES = ["summary", "question", "decision", "evidence"] as const;

export type NoteDraft = {
  type: (typeof NOTE_TYPES)[number];
  title: string;
  body: string;
  recallPrompt: string;
  evidenceGrade: string;
  sourceUrl: string;
};

export function draftKey(context: { noteId?: string; moduleId: string; sessionId?: string }): string {
  if (context.noteId) return `${PREFIX}note:${context.noteId}`;
  return `${PREFIX}new:${context.moduleId}:${context.sessionId ?? "none"}`;
}

export function serializeDraft(draft: NoteDraft, savedAt: Date): string {
  return JSON.stringify({ v: VERSION, draft, savedAt: savedAt.toISOString() });
}

export function parseDraft(raw: string | null): { draft: NoteDraft; savedAt: Date } | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { v?: unknown; draft?: Record<string, unknown>; savedAt?: unknown };
    const draft = value.draft;
    if (value.v !== VERSION || !draft || typeof value.savedAt !== "string") return null;
    const savedAt = new Date(value.savedAt);
    if (Number.isNaN(savedAt.getTime())) return null;
    if (!NOTE_TYPES.includes(draft.type as NoteDraft["type"])) return null;
    const fields = ["title", "body", "recallPrompt", "evidenceGrade", "sourceUrl"] as const;
    if (!fields.every((field) => typeof draft[field] === "string")) return null;
    return { draft: draft as unknown as NoteDraft, savedAt };
  } catch {
    return null;
  }
}

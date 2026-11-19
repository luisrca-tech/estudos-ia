/** Global keyboard shortcuts. Single keys never fire while the user is typing. */

export type ShortcutAction = "palette" | "session" | "reviews" | "new-note" | "save";

type TargetLike = { tagName?: string; type?: string; isContentEditable?: boolean } | null | undefined;

const NON_TEXT_INPUTS = new Set([
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "file",
  "range",
  "color",
  "image",
  "hidden",
]);

export function isTypingTarget(target: unknown): boolean {
  const element = target as TargetLike;
  if (!element || typeof element !== "object") return false;
  if (element.isContentEditable) return true;
  const tag = element.tagName?.toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return !NON_TEXT_INPUTS.has((element.type ?? "text").toLowerCase());
  return false;
}

export type KeyLike = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  target: unknown;
};

const SINGLE_KEYS: Record<string, ShortcutAction> = { s: "session", r: "reviews", n: "new-note" };

export function shortcutFor(event: KeyLike): ShortcutAction | null {
  const key = event.key.toLowerCase();
  const command = event.metaKey || event.ctrlKey;
  if (command && !event.altKey) {
    if (key === "k") return "palette";
    if (key === "s") return "save";
    return null;
  }
  if (command || event.altKey || isTypingTarget(event.target)) return null;
  return SINGLE_KEYS[key] ?? null;
}

export type ReviewAction = "reveal" | "forgot" | "recalled";

/** Review keys: Space reveals the note, then 1 = Não lembrei and 2 = Lembrei. */
export function reviewKeyFor(event: KeyLike, revealed: boolean): ReviewAction | null {
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || isTypingTarget(event.target)) return null;
  if (!revealed) return event.key === " " ? "reveal" : null;
  if (event.key === "1") return "forgot";
  if (event.key === "2") return "recalled";
  return null;
}

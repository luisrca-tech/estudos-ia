"use client";

import { Alert } from "@estudos-ia/ui/components/alert";
import { Button, Kbd } from "@estudos-ia/ui/components/button";
import { ConfirmDialog } from "@estudos-ia/ui/components/confirm-dialog";
import { controlClassName } from "@estudos-ia/ui/components/input";
import { cn } from "@estudos-ia/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, BookOpenIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Markdown } from "@/components/markdown";
import { draftKey, parseDraft, serializeDraft, type NoteDraft } from "@/lib/draft";
import { formatDayMonth, formatLastSession, formatTime, moduleNumber } from "@/lib/format";
import { BODY_PLACEHOLDERS, GRADES, NOTE_TYPES, noteTypeLabel, type NoteType } from "@/lib/labels";
import { templateBody, templateProgress } from "@/lib/note-template";
import { routes } from "@/lib/routes";
import { useRefreshAll } from "@/lib/use-refresh";
import { useTRPC, type RouterOutputs } from "@/utils/trpc";

type ExistingNote = RouterOutputs["notes"]["byId"];
type ModuleRef = { id: string; slug: string; kicker: string; title: string };

type NoteFormProps = {
  module: ModuleRef;
  /** Present in edit mode. */
  note?: ExistingNote;
  initialType?: NoteType;
  sessionId?: string;
};

const TITLE_MAX = 200;
const BODY_MAX = 50_000;
const AUTOSAVE_DELAY_MS = 800;

const TITLE_PLACEHOLDERS: Record<NoteType, string> = {
  summary: "A ideia, em poucas palavras",
  question: "A pergunta, do jeito que você faria a um colega",
  decision: "O que foi (ou vai ser) decidido",
  evidence: "O que a fonte sustenta",
};

const GRADE_OPTIONS = [...GRADES.map((grade) => ({ value: grade.value as string, meaning: grade.meaning })), { value: "", meaning: "sem grau" }];

function isValidUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function emptyDraft(type: NoteType): NoteDraft {
  return { type, title: "", body: templateBody(type) ?? "", recallPrompt: "", evidenceGrade: "", sourceUrl: "" };
}

function draftFromNote(note: ExistingNote): NoteDraft {
  return {
    type: note.type,
    title: note.title,
    body: note.body,
    recallPrompt: note.recallPrompt ?? "",
    evidenceGrade: note.evidenceGrade ?? "",
    sourceUrl: note.sourceUrl ?? "",
  };
}

const sameDraft = (a: NoteDraft, b: NoteDraft) => JSON.stringify(a) === JSON.stringify(b);

function readDraft(key: string) {
  try {
    return parseDraft(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeDraft(key: string, value: NoteDraft | null) {
  try {
    if (value) window.localStorage.setItem(key, serializeDraft(value, new Date()));
    else window.localStorage.removeItem(key);
  } catch {
    // Private mode or full storage: the note still saves normally.
  }
}

/** Single-choice row on a sunken track (boards Editor and Componentes). */
function ChoiceGroup<T extends string>({
  label,
  labelledBy,
  value,
  onChange,
  options,
  mono,
}: {
  label?: string;
  labelledBy?: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string; title?: string }>;
  mono?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-labelledby={labelledBy}
      className="inline-flex flex-wrap gap-0.5 self-start rounded-[6px] bg-surface-sunken p-[3px]"
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value || "none"}
            type="button"
            role="radio"
            aria-checked={on}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-9 cursor-pointer rounded-sm border px-3 text-sm transition-colors duration-150",
              mono && "min-w-[38px] px-2 font-mono text-[13px] font-medium",
              on ? "border-line bg-surface font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Create and edit form for the four note types (boards Editor and Editor-previa). */
export function NoteForm({ module, note, initialType = "summary", sessionId }: NoteFormProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const refreshAll = useRefreshAll();
  const key = draftKey({ noteId: note?.id, moduleId: module.id, sessionId });
  const initial = useRef<NoteDraft>(note ? draftFromNote(note) : emptyDraft(initialType));

  const [form, setForm] = useState<NoteDraft>(initial.current);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [restored, setRestored] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirm, setConfirm] = useState<"discard" | "delete" | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const session = useQuery({
    ...trpc.sessions.list.queryOptions({ moduleId: module.id, limit: 50 }),
    enabled: Boolean(sessionId),
  });
  const linkedSession = session.data?.find((entry) => entry.id === sessionId);
  const sourceClosed = form.type === "summary" && Boolean(sessionId) && !note;

  // Restore a draft left from an earlier visit.
  useEffect(() => {
    const stored = readDraft(key);
    if (stored && !sameDraft(stored.draft, initial.current)) {
      setForm(stored.draft);
      setSavedAt(stored.savedAt);
      setRestored(true);
    }
  }, [key]);

  // Autosave: only drafts that differ from what is already saved.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (sameDraft(form, initial.current)) {
        writeDraft(key, null);
        return;
      }
      writeDraft(key, form);
      setSavedAt(new Date());
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [form, key]);

  const set = <K extends keyof NoteDraft>(field: K, value: NoteDraft[K]) => setForm((current) => ({ ...current, [field]: value }));

  const changeType = (type: NoteType) =>
    setForm((current) => {
      // An untouched template follows the type; written text stays.
      const untouched = !current.body.trim() || current.body === templateBody(current.type);
      return { ...current, type, body: untouched ? (templateBody(type) ?? "") : current.body };
    });

  const leave = () => router.push(routes.module(module.slug));

  const remove = useMutation(
    trpc.notes.delete.mutationOptions({
      onSuccess: () => {
        writeDraft(key, null);
        toast.success("Nota apagada");
        leave();
        return refreshAll();
      },
      onError: (error) => toast.error("A nota não foi apagada", { description: error.message }),
    }),
  );
  const undoCreate = useMutation(trpc.notes.delete.mutationOptions({ onSuccess: () => refreshAll() }));

  const create = useMutation(
    trpc.notes.create.mutationOptions({
      onSuccess: (created) => {
        writeDraft(key, null);
        initial.current = form;
        toast.success(`${created.type === "summary" ? "Resumo salvo" : "Nota salva"}. A pergunta volta amanhã.`, {
          action: { label: "Desfazer", onClick: () => undoCreate.mutate({ id: created.id }) },
        });
        leave();
        return refreshAll();
      },
      onError: (error) => toast.error("A nota não foi salva", { description: error.message }),
    }),
  );
  const update = useMutation(
    trpc.notes.update.mutationOptions({
      onSuccess: () => {
        writeDraft(key, null);
        initial.current = form;
        toast.success("Nota atualizada");
        leave();
        return refreshAll();
      },
      onError: (error) => toast.error("A nota não foi atualizada", { description: error.message }),
    }),
  );

  const errors = {
    title: form.title.trim() ? undefined : "Dê um título à nota.",
    body: form.body.trim() ? undefined : "Escreva o corpo da nota.",
    sourceUrl:
      !form.sourceUrl.trim() || isValidUrl(form.sourceUrl.trim())
        ? undefined
        : "Use um endereço completo, começando com http:// ou https://.",
  };
  const show = (field: keyof typeof errors) => (submitted ? errors[field] : undefined);
  const saving = create.isPending || update.isPending;

  const save = () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || saving) return;
    const fields = {
      type: form.type,
      title: form.title.trim(),
      body: form.body,
      recallPrompt: form.recallPrompt.trim() || null,
      evidenceGrade: (form.evidenceGrade || null) as "A" | "B" | "C" | "D" | "E" | null,
      sourceUrl: form.sourceUrl.trim() || null,
    };
    if (note) update.mutate({ id: note.id, ...fields });
    else create.mutate({ moduleId: module.id, sessionId, ...fields });
  };

  // ⌘S / Ctrl+S saves from anywhere in the form, including inside fields.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const discard = () => {
    writeDraft(key, null);
    setConfirm(null);
    leave();
  };

  const progress = templateProgress(form.type, form.body);
  const written = progress?.filter((section) => section.written).length ?? 0;
  const grade = GRADE_OPTIONS.find((option) => option.value === form.evidenceGrade) ?? GRADE_OPTIONS.at(-1)!;
  const context = note
    ? `Editando ${noteTypeLabel(note.type).toLowerCase()} de ${formatDayMonth(note.createdAt)}`
    : sessionId && form.type === "summary"
      ? linkedSession
        ? `Resumo da sessão de ${formatLastSession(linkedSession.startedAt, new Date())}`
        : "Resumo da sessão"
      : `${form.type === "summary" ? "Novo" : "Nova"} ${noteTypeLabel(form.type).toLowerCase()} no ${moduleNumber(module.kicker)}`;
  const dirty = !sameDraft(form, initial.current);

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="mx-auto flex w-full max-w-page flex-col gap-5 px-4 pt-6 pb-24 sm:px-8"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line pb-4">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col">
          <Link href={routes.module(module.slug)} className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground no-underline hover:text-foreground">
            <ArrowLeftIcon aria-hidden className="size-3.5" />
            {moduleNumber(module.kicker)} · {module.title}
          </Link>
          <h1 className="text-sm font-medium">{context}</h1>
        </div>
        <span className="text-[13px] text-muted-foreground" aria-live="polite">
          {savedAt ? `${restored ? "Rascunho restaurado" : "Rascunho salvo"} às ${formatTime(savedAt)}` : dirty ? "" : note ? "Sem alterações" : ""}
        </span>
        <Button type="button" variant="ghost" onClick={() => (dirty ? setConfirm("discard") : leave())}>
          Descartar
        </Button>
        <Button type="submit" loading={saving} aria-keyshortcuts="Meta+S Control+S">
          {note ? "Salvar alterações" : "Salvar nota"}
          <Kbd inverted className="text-[11px]">
            ⌘S
          </Kbd>
        </Button>
      </div>

      {note?.source === "html_import" ? (
        <Alert tone="info" title="Nota importada do HTML da trilha">
          Ela entra nas revisões, mas não conta como resumo de nenhuma sessão.
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <ChoiceGroup label="Tipo de nota" value={form.type} onChange={changeType} options={NOTE_TYPES} />
        {sourceClosed ? (
          <span className="inline-flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
            <BookOpenIcon aria-hidden className="size-3.5" />
            Fonte fechada: escreva de memória.
            <a href={routes.module(module.slug)} target="_blank" rel="noreferrer" className="text-muted-foreground underline">
              Abrir mesmo assim
            </a>
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="note-title" className="text-[13px] text-muted-foreground">
          Título
        </label>
        <input
          id="note-title"
          value={form.title}
          maxLength={TITLE_MAX}
          placeholder={TITLE_PLACEHOLDERS[form.type]}
          onChange={(event) => set("title", event.target.value)}
          aria-invalid={Boolean(show("title")) || undefined}
          aria-describedby={show("title") ? "note-title-error" : undefined}
          className="h-13 border-0 border-b border-line-strong bg-transparent px-0.5 font-serif text-[26px] font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground/70 focus-visible:border-accent focus-visible:outline-none aria-invalid:border-danger"
        />
        {show("title") ? (
          <p id="note-title-error" role="alert" className="text-sm font-medium text-danger">
            {show("title")}
          </p>
        ) : null}
      </div>

      {progress ? (
        <div aria-label="Seções do modelo" className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[13px] text-muted-foreground">
            Modelo · {written} de {progress.length}
          </span>
          {progress.map((section) => (
            <span
              key={section.name}
              className={cn(
                "inline-flex h-[26px] items-center gap-1 rounded-full border px-[9px] text-xs font-medium",
                section.written ? "border-transparent bg-success-soft text-success" : "border-line-strong text-muted-foreground",
              )}
            >
              <span aria-hidden>{section.written ? "✓" : "○"}</span>
              {section.name}
              <span className="sr-only">{section.written ? ", escrita" : ", falta escrever"}</span>
            </span>
          ))}
          {!form.body.trim() ? (
            <Button type="button" variant="link" size="sm" onClick={() => set("body", templateBody(form.type) ?? "")}>
              Inserir o modelo
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-stretch gap-6">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-1.5">
          <label htmlFor="note-body" className="flex justify-between text-[13px] text-muted-foreground">
            <span>Markdown</span>
            <span className="font-mono">{form.body.length.toLocaleString("pt-BR")} caracteres</span>
          </label>
          <textarea
            id="note-body"
            value={form.body}
            maxLength={BODY_MAX}
            placeholder={BODY_PLACEHOLDERS[form.type]}
            spellCheck
            onChange={(event) => set("body", event.target.value)}
            aria-invalid={Boolean(show("body")) || undefined}
            aria-describedby={show("body") ? "note-body-error" : undefined}
            className={cn(controlClassName, "min-h-[22rem] flex-1 resize-y p-4 font-mono text-sm leading-[1.7] sm:min-h-[32.5rem]")}
          />
          {show("body") ? (
            <p id="note-body-error" role="alert" className="text-sm font-medium text-danger">
              {show("body")}
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-1.5">
          <span className="text-[13px] text-muted-foreground" id="note-preview-label">
            Como vai ficar
          </span>
          <article aria-labelledby="note-preview-label" className="flex-1 px-1 py-2">
            {form.body.trim() ? <Markdown>{form.body}</Markdown> : <p className="text-muted-foreground">Nada para mostrar ainda.</p>}
          </article>
        </div>
      </div>

      <fieldset className="flex flex-wrap gap-x-8 gap-y-5 border-t border-line pt-5">
        <legend className="float-left mb-3 w-full p-0 font-serif text-xl font-semibold">Para revisar depois</legend>
        <div className="flex min-w-0 flex-[2_1_380px] flex-col gap-1.5">
          <label htmlFor="note-recall" className="text-sm font-medium">
            Pergunta de revisão
          </label>
          <input
            id="note-recall"
            value={form.recallPrompt}
            maxLength={500}
            onChange={(event) => set("recallPrompt", event.target.value)}
            aria-describedby="note-recall-hint"
            className={cn(controlClassName, "h-11")}
          />
          <span id="note-recall-hint" className="text-[13px] text-muted-foreground">
            Volta para você em 1, 3, 7 e 21 dias. Pergunte o que exige lembrar, não reconhecer. Sem ela, o app pergunta pelo título.
          </span>
        </div>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
          <span id="note-grade" className="text-sm font-medium">
            Grau da evidência
          </span>
          <ChoiceGroup
            labelledBy="note-grade"
            value={form.evidenceGrade}
            onChange={(value) => set("evidenceGrade", value)}
            mono
            options={GRADE_OPTIONS.map((option) => ({ value: option.value, label: option.value || "–", title: option.meaning }))}
          />
          <span className="text-[13px] text-muted-foreground">
            {grade.value ? `${grade.value}: ${grade.meaning}.` : "Sem grau."}
          </span>
        </div>
        <div className={cn("flex min-w-0 flex-col gap-1.5", form.type === "evidence" ? "flex-[1_1_100%] order-first" : "flex-[1_1_100%]")}>
          <label htmlFor="note-source-url" className="text-sm font-medium">
            URL da fonte
            {form.type === "evidence" ? null : <span className="font-normal text-muted-foreground"> (opcional)</span>}
          </label>
          <input
            id="note-source-url"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={form.sourceUrl}
            onChange={(event) => set("sourceUrl", event.target.value)}
            aria-invalid={Boolean(show("sourceUrl")) || undefined}
            aria-describedby={show("sourceUrl") ? "note-source-url-error" : undefined}
            className={cn(controlClassName, "h-11 max-w-reading")}
          />
          {show("sourceUrl") ? (
            <p id="note-source-url-error" role="alert" className="text-sm font-medium text-danger">
              {show("sourceUrl")}
            </p>
          ) : null}
        </div>
      </fieldset>

      {note ? (
        <div className="flex border-t border-line pt-5">
          <Button type="button" variant="danger" onClick={() => setConfirm("delete")}>
            Apagar nota
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirm === "discard"}
        onOpenChange={(open) => setConfirm(open ? "discard" : null)}
        title={note ? "Descartar as alterações?" : "Descartar este rascunho?"}
        description={note ? "A nota volta a ser como estava salva." : "O texto escrito aqui é apagado deste navegador."}
        confirmLabel={note ? "Descartar alterações" : "Descartar rascunho"}
        cancelLabel="Continuar escrevendo"
        onConfirm={discard}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => setConfirm(open ? "delete" : null)}
        title="Apagar esta nota?"
        description="A agenda de revisão dela também é apagada. Não dá para desfazer."
        confirmLabel="Apagar nota"
        cancelLabel="Manter nota"
        pending={remove.isPending}
        onConfirm={() => note && remove.mutate({ id: note.id })}
      />
    </form>
  );
}

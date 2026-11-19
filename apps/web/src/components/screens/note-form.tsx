"use client";

import { Alert } from "@estudos-ia/ui/components/alert";
import { Button, buttonVariants } from "@estudos-ia/ui/components/button";
import { Card } from "@estudos-ia/ui/components/card";
import { Field } from "@estudos-ia/ui/components/field";
import { Input } from "@estudos-ia/ui/components/input";
import { MarkdownEditor } from "@estudos-ia/ui/components/markdown-editor";
import { Segmented } from "@estudos-ia/ui/components/segmented";
import { Select } from "@estudos-ia/ui/components/select";
import { cn } from "@estudos-ia/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Markdown } from "@/components/markdown";
import { BODY_PLACEHOLDERS, BODY_TEMPLATES, GRADES, NOTE_TYPES, type Grade, type NoteType } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { useRefreshAll } from "@/lib/use-refresh";
import { useTRPC, type RouterOutputs } from "@/utils/trpc";

type ExistingNote = RouterOutputs["notes"]["byId"];

type NoteFormProps = {
  module: { id: string; slug: string };
  /** Present in edit mode. */
  note?: ExistingNote;
  initialType?: NoteType;
  sessionId?: string;
};

const TITLE_MAX = 200;
const BODY_MAX = 50_000;

const TITLE_PLACEHOLDERS: Record<NoteType, string> = {
  summary: "A ideia, em poucas palavras",
  question: "A pergunta, do jeito que você faria a um colega",
  decision: "O que foi (ou vai ser) decidido",
  evidence: "O que a fonte sustenta",
};

function isValidUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** Create and edit form for the four note types. */
export function NoteForm({ module, note, initialType = "summary", sessionId }: NoteFormProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const refreshAll = useRefreshAll();

  const [type, setType] = useState<NoteType>(note?.type ?? initialType);
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [recallPrompt, setRecallPrompt] = useState(note?.recallPrompt ?? "");
  const [grade, setGrade] = useState<Grade | "">((note?.evidenceGrade as Grade | null) ?? "");
  const [sourceUrl, setSourceUrl] = useState(note?.sourceUrl ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const done = (message: string) => {
    toast.success(message);
    router.push(routes.module(module.slug));
    return refreshAll();
  };
  const failed = (what: string) => (error: { message: string }) => {
    toast.error(what, { description: error.message });
  };

  const create = useMutation(trpc.notes.create.mutationOptions({ onSuccess: () => done("Nota salva"), onError: failed("A nota não foi salva") }));
  const update = useMutation(trpc.notes.update.mutationOptions({ onSuccess: () => done("Nota atualizada"), onError: failed("A nota não foi atualizada") }));
  const remove = useMutation(trpc.notes.delete.mutationOptions({ onSuccess: () => done("Nota apagada"), onError: failed("A nota não foi apagada") }));

  const errors = {
    title: title.trim() ? undefined : "Dê um título à nota.",
    body: body.trim() ? undefined : "Escreva o corpo da nota.",
    sourceUrl: !sourceUrl.trim() || isValidUrl(sourceUrl.trim()) ? undefined : "Use um endereço completo, começando com http:// ou https://.",
  };
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);
  const saving = create.isPending || update.isPending;
  const template = BODY_TEMPLATES[type];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    const fields = {
      type,
      title: title.trim(),
      body,
      recallPrompt: recallPrompt.trim() || null,
      evidenceGrade: grade || null,
      sourceUrl: sourceUrl.trim() || null,
    };
    if (note) update.mutate({ id: note.id, ...fields });
    else create.mutate({ moduleId: module.id, sessionId, ...fields });
  };

  const sourceFields = (
    <div className="grid gap-4 sm:grid-cols-[1fr_16rem]">
      <Field label="URL da fonte" htmlFor="note-source-url" optional error={show("sourceUrl")}>
        <Input
          id="note-source-url"
          type="url"
          inputMode="url"
          placeholder="https://"
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          aria-invalid={Boolean(show("sourceUrl")) || undefined}
          aria-describedby={show("sourceUrl") ? "note-source-url-error" : undefined}
        />
      </Field>
      <Field label="Grau de evidência" htmlFor="note-grade" optional>
        <Select id="note-grade" value={grade} onChange={(event) => setGrade(event.target.value as Grade | "")}>
          <option value="">Sem grau</option>
          {GRADES.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.value}: {entry.meaning}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {sessionId && !note ? (
        <Alert tone="info" title="Este resumo fica ligado à sessão que você acabou de fazer">
          Escreva sem olhar a fonte. O que você não lembrar é o que vale reler.
        </Alert>
      ) : null}
      {note?.source === "html_import" ? (
        <Alert tone="info" title="Nota importada do HTML da trilha">
          Ela entra nas revisões, mas não conta como resumo de nenhuma sessão.
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium" id="note-type-label">
          Tipo
        </span>
        <Segmented label="Tipo de nota" name="note-type" value={type} onValueChange={setType} options={NOTE_TYPES} />
      </div>

      <Field label="Título" htmlFor="note-title" error={show("title")}>
        <Input
          id="note-title"
          value={title}
          maxLength={TITLE_MAX}
          placeholder={TITLE_PLACEHOLDERS[type]}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={Boolean(show("title")) || undefined}
          aria-describedby={show("title") ? "note-title-error" : undefined}
          className="font-serif text-lg"
        />
      </Field>

      {type === "evidence" ? (
        <Card variant="sunken" padding="sm" className="flex flex-col gap-3 border-accent/40">
          <p className="font-medium">De onde vem esta evidência?</p>
          {sourceFields}
        </Card>
      ) : null}

      <Field label="Corpo (Markdown)" htmlFor="note-body" error={show("body")}>
        <MarkdownEditor
          id="note-body"
          value={body}
          onValueChange={setBody}
          maxLength={BODY_MAX}
          placeholder={BODY_PLACEHOLDERS[type]}
          invalid={Boolean(show("body"))}
          describedBy={show("body") ? "note-body-error" : undefined}
          renderPreview={(value) => <Markdown>{value}</Markdown>}
        />
        {template && !body.trim() ? (
          <div>
            <Button type="button" variant="link" size="sm" onClick={() => setBody(template)}>
              Preencher com o modelo de {type === "summary" ? "nota de conceito" : "ficha de decisão"}
            </Button>
          </div>
        ) : null}
      </Field>

      <Field
        label="Pergunta de revisão"
        htmlFor="note-recall"
        optional
        hint="É o que aparece na revisão antes de revelar a nota. Prefira perguntas de decisão ou de mecanismo. Sem ela, o app monta uma pergunta com o título."
      >
        <Input
          id="note-recall"
          value={recallPrompt}
          maxLength={500}
          onChange={(event) => setRecallPrompt(event.target.value)}
          aria-describedby="note-recall-hint"
        />
      </Field>

      {type === "evidence" ? null : sourceFields}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button type="submit" loading={saving}>
          {note ? "Salvar alterações" : "Salvar nota"}
        </Button>
        <Link href={routes.module(module.slug)} className={buttonVariants({ variant: "ghost" })}>
          Voltar sem salvar
        </Link>
        {note ? (
          <div className={cn("flex flex-wrap items-center gap-3 sm:ml-auto", confirmingDelete && "w-full sm:w-auto")}>
            {confirmingDelete ? (
              <>
                <span className="text-sm" role="alert">
                  Apagar esta nota e a agenda de revisão dela? Não dá para desfazer.
                </span>
                <Button type="button" variant="danger" size="sm" loading={remove.isPending} onClick={() => remove.mutate({ id: note.id })}>
                  Sim, apagar
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                  Manter
                </Button>
              </>
            ) : (
              <Button type="button" variant="danger" onClick={() => setConfirmingDelete(true)}>
                Apagar
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </form>
  );
}

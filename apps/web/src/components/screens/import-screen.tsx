"use client";

import { Alert } from "@estudos-ia/ui/components/alert";
import { Button, buttonVariants } from "@estudos-ia/ui/components/button";
import { cn } from "@estudos-ia/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { CheckIcon, CircleCheckIcon, CopyIcon, FileTextIcon, UploadIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { plural } from "@/lib/format";
import { importOutcome, importSummary, resultLine } from "@/lib/import-summary";
import { routes } from "@/lib/routes";
import { useRefreshAll } from "@/lib/use-refresh";
import { useTRPC } from "@/utils/trpc";

const MAX_FILE_BYTES = 1_000_000;
const STEPS = ["Arquivo", "Prévia", "Resultado"] as const;

// Run in the browser console with the track HTML open; exports its localStorage as JSON.
const CONSOLE_SNIPPET =
  "copy(JSON.stringify({notes:Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('trilha-ia-v3:note:')).map(k=>[k.slice(18),localStorage[k]])),done:Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('trilha-ia-v3:done:')).map(k=>[k.slice(18),localStorage[k]==='1']))}))";

type LoadedFile = { fileName: string; text: string; size: number };

function formatSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function Steps({ current }: { current: number }) {
  return (
    <ol aria-label="Etapas" className="grid grid-cols-3 gap-2">
      {STEPS.map((label, index) => (
        <li key={label} aria-current={index === current ? "step" : undefined} className="flex flex-col gap-2">
          <span className={cn("h-[3px] rounded-[1px]", index <= current ? "bg-accent" : "bg-surface-sunken")} />
          <span className={cn("text-sm", index <= current ? "text-foreground" : "text-muted-foreground", index === current && "font-semibold")}>
            <span className="font-mono">{index + 1}</span> · {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ConsoleSnippet() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONSOLE_SNIPPET);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <details className="group rounded-md border border-line bg-surface px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium">Sem o arquivo? Copie direto do navegador</summary>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Abra o HTML da trilha, abra o console do navegador (F12), cole o comando e aperte Enter. O JSON vai para a área de transferência:
          salve como .json e envie acima.
        </p>
        <pre className="overflow-x-auto rounded-md bg-surface-sunken p-4 font-mono text-xs break-all whitespace-pre-wrap">
          <code>{CONSOLE_SNIPPET}</code>
        </pre>
        <Button variant="outline" size="sm" className="self-start" onClick={copy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Comando copiado" : "Copiar comando"}
        </Button>
      </div>
    </details>
  );
}

export function ImportScreen() {
  const trpc = useTRPC();
  const refreshAll = useRefreshAll();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const preview = useMutation(trpc.importer.preview.mutationOptions());
  const commit = useMutation(trpc.importer.commit.mutationOptions({ onSuccess: () => refreshAll() }));

  const reset = () => {
    setFile(null);
    setFileError(null);
    preview.reset();
    commit.reset();
    if (input.current) input.current.value = "";
  };

  const onFile = async (selected: File | undefined) => {
    reset();
    if (!selected) return;
    if (selected.size > MAX_FILE_BYTES) {
      setFileError("O arquivo passa de 1 MB. O export do HTML costuma ter poucos KB: confira se é o arquivo certo.");
      return;
    }
    const text = await selected.text();
    if (!text.trim()) {
      setFileError("O arquivo está vazio.");
      return;
    }
    setFile({ fileName: selected.name, text, size: selected.size });
    preview.mutate({ fileName: selected.name, text });
  };

  const data = preview.data;
  const step = commit.isSuccess ? 2 : data && file ? 1 : 0;
  const summary = data ? importSummary(data.rows) : null;
  const canCommit = data ? data.rows.some((row) => importOutcome(row).creates || importOutcome(row).raises) : false;

  return (
    <main className="mx-auto flex w-full max-w-[47.5rem] flex-col gap-7 px-4 pt-8 pb-24 sm:px-8 sm:pt-12">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-serif text-3xl font-semibold sm:text-[2.375rem] sm:leading-[1.15]">Importar anotações</h1>
        <p className="text-muted-foreground">
          Traga o <code className="font-mono text-[0.9em]">anotacoes-trilha-ia.md</code> exportado do HTML da trilha. Nada é gravado antes de você
          confirmar a prévia.
        </p>
      </header>

      <Steps current={step} />

      {step === 0 ? (
        <section className="flex flex-col gap-3">
          <label
            htmlFor="import-file"
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void onFile(event.dataTransfer.files[0]);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-[1.5px] border-dashed px-6 py-12 text-center transition-colors duration-150 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
              dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-surface hover:border-foreground/40",
            )}
          >
            <UploadIcon aria-hidden className="size-7 text-muted-foreground" strokeWidth={1.5} />
            <span className="font-medium">Solte o arquivo .md aqui</span>
            <span className="text-sm text-muted-foreground">ou</span>
            <span className={buttonVariants({ variant: "outline", size: "sm" })}>Escolher arquivo</span>
            <input
              ref={input}
              id="import-file"
              type="file"
              accept=".md,.markdown,.json,text/markdown,application/json"
              onChange={(event) => onFile(event.target.files?.[0])}
              aria-invalid={Boolean(fileError) || undefined}
              aria-describedby="import-file-hint"
              className="sr-only"
            />
          </label>
          <p id="import-file-hint" className="text-[13px] text-muted-foreground">
            Notas importadas recebem a origem &quot;HTML da trilha&quot;. Reimportar o mesmo arquivo não duplica nada.
          </p>
          {fileError ? (
            <Alert tone="danger" title="Arquivo recusado.">
              {fileError}
            </Alert>
          ) : null}
          {preview.isPending ? <p role="status">Lendo o arquivo…</p> : null}
          {preview.isError ? (
            <Alert tone="danger" title="Não foi possível ler o arquivo.">
              {preview.error.message}
            </Alert>
          ) : null}
          <ConsoleSnippet />
        </section>
      ) : null}

      {step === 1 && data && file && summary ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm">
            <FileTextIcon aria-hidden className="size-[18px] flex-none text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">
              {file.fileName} · {formatSize(file.size)} · {plural(data.rows.length, "seção", "seções")}
            </span>
            <Button variant="ghost" size="sm" onClick={reset} disabled={commit.isPending}>
              Trocar
            </Button>
          </div>

          {data.warnings.length > 0 ? (
            <Alert tone="warning" title={plural(data.warnings.length, "aviso", "avisos")}>
              <ul className="list-disc pl-5">
                {data.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {data.rows.length === 0 ? (
            <Alert tone="info" title="Nenhuma anotação encontrada no arquivo.">
              Todas as seções estão vazias, ou os títulos não batem com os módulos deste app.
            </Alert>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-line bg-surface" tabIndex={0} aria-label="Prévia da importação">
              <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Seção
                    </th>
                    <th scope="col" className="w-20 px-4 py-3 font-medium">
                      Notas
                    </th>
                    <th scope="col" className="w-24 px-4 py-3 font-medium">
                      Marcado ✓
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      O que acontece
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => {
                    const outcome = importOutcome(row);
                    const active = outcome.creates || outcome.raises;
                    return (
                      <tr key={row.moduleKey} className={cn("border-t border-line", active ? "text-foreground" : "text-muted-foreground")}>
                        <th scope="row" className="px-4 py-3 font-normal">
                          {row.kicker}
                        </th>
                        <td className="px-4 py-3 font-mono">{outcome.notes}</td>
                        <td className="px-4 py-3">{row.done ? "sim" : "–"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex h-[22px] items-center rounded-full px-2 text-xs font-medium whitespace-nowrap",
                              active ? "bg-success-soft text-success" : "bg-surface-sunken text-muted-foreground",
                            )}
                          >
                            {outcome.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {commit.isError ? (
            <Alert tone="danger" title="A importação falhou. Nada foi gravado.">
              {commit.error.message}
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <span className="mr-auto text-sm text-muted-foreground">{summary.line}</span>
            <Button variant="ghost" onClick={reset} disabled={commit.isPending}>
              Cancelar
            </Button>
            <Button loading={commit.isPending} disabled={!canCommit} onClick={() => commit.mutate({ fileName: file.fileName, text: file.text })}>
              {summary.toCreate > 0 ? `Importar ${plural(summary.toCreate, "nota", "notas")}` : "Importar"}
            </Button>
          </div>
        </section>
      ) : null}

      {step === 2 && commit.data ? (
        <section role="status" className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <CircleCheckIcon aria-hidden className="size-7 flex-none text-success" strokeWidth={1.5} />
            <div className="flex flex-col gap-1">
              <h2 className="font-serif text-2xl font-semibold">
                {commit.data.created === 0 ? "Nenhuma nota nova importada" : plural(commit.data.created, "nota importada", "notas importadas")}
              </h2>
              <p className="text-muted-foreground">
                {commit.data.created === 0
                  ? "Tudo o que estava no arquivo já tinha sido importado."
                  : commit.data.created > 3
                    ? "Elas entram na revisão espaçada a partir de amanhã, no máximo 3 por dia."
                    : "Elas já entram na revisão espaçada a partir de amanhã."}
              </p>
            </div>
          </div>
          {commit.data.modules.length > 0 ? (
            <ul className="flex flex-col rounded-lg border border-line bg-surface">
              {commit.data.modules.map((module) => (
                <li key={module.moduleKey} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-3 text-sm first:border-t-0">
                  <span className="min-w-0 flex-1">{module.kicker}</span>
                  <span className="font-mono text-muted-foreground">{resultLine(module)}</span>
                  <Link href={routes.module(module.moduleSlug)} className="font-medium text-accent">
                    Abrir módulo
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {commit.data.warnings.length > 0 ? (
            <Alert tone="warning" title={plural(commit.data.warnings.length, "aviso", "avisos")}>
              <ul className="list-disc pl-5">
                {commit.data.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Link href="/" className={buttonVariants()}>
              Voltar para Hoje
            </Link>
            <Button variant="outline" onClick={reset}>
              Importar outro arquivo
            </Button>
          </div>
        </section>
      ) : null}
    </main>
  );
}

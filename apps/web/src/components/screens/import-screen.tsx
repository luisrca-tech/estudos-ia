"use client";

import { Alert } from "@estudos-ia/ui/components/alert";
import { Badge } from "@estudos-ia/ui/components/badge";
import { Button, buttonVariants } from "@estudos-ia/ui/components/button";
import { Field } from "@estudos-ia/ui/components/field";
import { PageHeader, PageShell, Section } from "@estudos-ia/ui/components/page";
import { useMutation } from "@tanstack/react-query";
import { CheckIcon, CopyIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { plural } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useRefreshAll } from "@/lib/use-refresh";
import { useTRPC } from "@/utils/trpc";

const MAX_FILE_BYTES = 1_000_000;

// Run in the browser console with the track HTML open; exports its localStorage as JSON.
const CONSOLE_SNIPPET =
  "copy(JSON.stringify({notes:Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('trilha-ia-v3:note:')).map(k=>[k.slice(18),localStorage[k]])),done:Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('trilha-ia-v3:done:')).map(k=>[k.slice(18),localStorage[k]==='1']))}))";

type LoadedFile = { fileName: string; text: string };

export function ImportScreen() {
  const trpc = useTRPC();
  const refreshAll = useRefreshAll();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    preview.reset();
    commit.reset();
    setFile(null);
    setFileError(null);
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
    const loaded = { fileName: selected.name, text };
    setFile(loaded);
    preview.mutate(loaded);
  };

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(CONSOLE_SNIPPET);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const data = preview.data;

  return (
    <PageShell width="reading">
      <PageHeader
        title="Importar anotações"
        description="Traga para cá o que você já escreveu no HTML da trilha. Cada módulo com anotações vira uma nota, que entra nas revisões aos poucos: no máximo 3 por dia."
      />

      <Section title="Arquivo" description='No HTML, use o botão "Exportar anotações". Ele baixa o arquivo anotacoes-trilha-ia.md.'>
        <Field label="Arquivo .md ou .json" htmlFor="import-file" error={fileError} hint="Limite de 1 MB. Nada é gravado até você clicar em Importar.">
          <input
            ref={input}
            id="import-file"
            type="file"
            accept=".md,.markdown,.json,text/markdown,application/json"
            onChange={(event) => onFile(event.target.files?.[0])}
            aria-invalid={Boolean(fileError) || undefined}
            aria-describedby={fileError ? "import-file-error" : "import-file-hint"}
            className="block w-full cursor-pointer rounded-sm border border-line-strong bg-surface text-base file:mr-4 file:cursor-pointer file:border-0 file:border-r file:border-line-strong file:bg-surface-sunken file:px-4 file:py-2.5 file:font-medium file:text-foreground hover:border-foreground/40"
          />
        </Field>
      </Section>

      {preview.isPending ? <p role="status">Lendo o arquivo…</p> : null}

      {preview.isError ? (
        <Alert tone="danger" title="Não foi possível ler o arquivo.">
          {preview.error.message}
        </Alert>
      ) : null}

      {data && file && !commit.isSuccess ? (
        <Section
          title="Prévia"
          aside={<Badge>{data.format === "markdown" ? "Markdown" : "JSON"}</Badge>}
          description={`${plural(data.toCreate, "nota nova", "notas novas")}, ${plural(data.toSkip, "já importada", "já importadas")}.`}
        >
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
            <div className="overflow-x-auto rounded-md border border-line bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">Módulo</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">Caracteres</th>
                    <th scope="col" className="px-4 py-2 font-medium">Degrau 3</th>
                    <th scope="col" className="px-4 py-2 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.rows.map((row) => (
                    <tr key={row.moduleKey}>
                      <th scope="row" className="px-4 py-2.5 font-normal">
                        <Link href={routes.module(row.moduleSlug)} className="font-medium underline-offset-[3px] hover:underline">
                          {row.kicker}
                        </Link>
                        <span className="block text-muted-foreground">{row.title}</span>
                      </th>
                      <td className="px-4 py-2.5 text-right tabular-nums">{row.characters.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-2.5">{row.done ? <Badge tone="success">✓ marcado</Badge> : <span className="text-muted-foreground">não</span>}</td>
                      <td className="px-4 py-2.5">
                        {row.characters === 0 ? (
                          <span className="text-muted-foreground">sem anotações</span>
                        ) : row.duplicate ? (
                          <Badge>já importado</Badge>
                        ) : (
                          <Badge tone="accent">nova nota</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {commit.isError ? (
            <Alert tone="danger" title="A importação falhou. Nada foi gravado.">
              {commit.error.message}
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button loading={commit.isPending} disabled={data.rows.length === 0} onClick={() => commit.mutate(file)}>
              Importar
            </Button>
            <Button variant="ghost" onClick={reset} disabled={commit.isPending}>
              Escolher outro arquivo
            </Button>
          </div>
        </Section>
      ) : null}

      {commit.isSuccess ? (
        <Alert
          tone="success"
          title="Importação concluída."
          actions={
            <>
              <Link href="/modules" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Ver módulos
              </Link>
              <Button variant="ghost" size="sm" onClick={reset}>
                Importar outro arquivo
              </Button>
            </>
          }
        >
          {plural(commit.data.created, "nota criada", "notas criadas")},{" "}
          {plural(commit.data.skipped, "ignorada por já existir", "ignoradas por já existirem")},{" "}
          {plural(commit.data.masteryUpdated, "módulo subiu para o degrau 3", "módulos subiram para o degrau 3")}.
          {commit.data.created > 0 ? " As primeiras revisões começam amanhã, 3 por dia." : ""}
        </Alert>
      ) : null}

      <Section
        title="Sem o arquivo? Copie direto do navegador"
        description="Abra o HTML da trilha, abra o console do navegador (F12), cole o comando e aperte Enter. O JSON vai para a área de transferência: salve como .json e envie acima."
      >
        <pre className="overflow-x-auto rounded-md bg-surface-sunken p-4 font-mono text-sm whitespace-pre-wrap break-all">
          <code>{CONSOLE_SNIPPET}</code>
        </pre>
        <div>
          <Button variant="outline" size="sm" onClick={copySnippet}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Comando copiado" : "Copiar comando"}
          </Button>
        </div>
      </Section>
    </PageShell>
  );
}

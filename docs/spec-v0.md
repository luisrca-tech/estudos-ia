# estudos-ia · Especificação técnica da V0

Data: 19/11/2026 · Autor: Tecnico · Para: Coder (T3 Code, WSL "LFRCA") · Validação: QA e Code Reviewer

App local, de um único usuário, para aplicar todo dia o método da *Trilha de Engenharia de Sistemas com IA* (HTML de 19/11/2026). A V0 não tem nenhuma IA. Ela precisa caber em poucas horas de implementação.

Convenção deste documento: **[Fato]** é algo verificado (com a fonte); **[Decisão]** é uma escolha minha, com o motivo; **[Suposição]** é uma escolha pequena e reversível que o Luis pode trocar sem impacto.

---

## 0. Correção importante no brief

**[Fato]** O botão "Exportar anotações" do HTML **não gera JSON**. Ele gera um **Markdown** chamado `anotacoes-trilha-ia.md` (JS do arquivo, linhas 1070–1077):

```js
var out='# Trilha de Engenharia de Sistemas com IA · anotações\n\nExportado em '+new Date().toLocaleString('pt-BR')+'\n';
notes.forEach(function(el){ ... out+='\n## '+k+' · '+h+(done?' ✓':'')+'\n\n'+(el.value.trim()||'_(sem anotações)_')+'\n'; });
a.download='anotacoes-trilha-ia.md';
```

- `k` é o kicker da seção (por exemplo `Módulo 6 · O mais importante`, ou `No mundo real` no caso de `casos`) e `h` é o `<h2>`.
- `✓` aparece quando a caixa "Cheguei ao degrau 3" do módulo está marcada (`localStorage` `trilha-ia-v3:done:<key>`).
- As chaves das notas (`data-note`) são `m1`…`m14` e `casos`. Há 15 textareas. A seção `casos` não tem caixa de concluído; a seção `metodo` tem caixa e não tem nota.

**[Decisão]** O importador da V0 lê esse Markdown como formato principal. Ele também aceita um JSON `{ "m1": "...", ..., "casos": "..." }`, para o caso de o Luis copiar o `localStorage` direto (o snippet de console está na seção 8.1). Assim os dois caminhos do brief ficam cobertos.

---

## 1. Escopo da V0

1. Os 15 módulos (Parte 1: m1–m10; Parte 2: m11–m14 e `casos`), extraídos **uma vez** do HTML por script para arquivos JSON versionados, validados com zod e carregados por um seed idempotente.
2. Anotações por módulo, com 4 tipos: `summary` (resumo com as próprias palavras), `question` (pergunta), `decision` (decisão) e `evidence` (evidência/fonte). O editor é Markdown simples: textarea com pré-visualização.
3. Importação do export do HTML (Markdown, ou o JSON alternativo).
4. Cronômetro de sessão ligado a um módulo, com notificação do Windows (Notification API do navegador) e um som ao terminar. A sessão fica registrada.
5. Rotinas diária, semanal e mensal como checklists, com histórico.
6. Cobranças por regra: sessão sem resumo próprio em até 24 h vira alerta; revisões espaçadas em 1, 3, 7 e 21 dias, com pergunta de recordação antes de revelar a nota.
7. Painel "Hoje".

Fora da V0: seção 12.

---

## 2. Stack e scaffold

### 2.1 O que foi verificado

**[Fato]** Rodei o scaffold num diretório descartável (`/tmp/bts-check`, já apagado) em 19/11/2026, às 16:30, com o `create-better-t-stack` **3.49.2** (`npm view create-better-t-stack version`). Também rodei um `--dry-run` sobre uma pasta vazia já existente, com `--directory-conflict merge`, e a configuração foi aceita. Flags conferidas em <https://www.better-t-stack.dev/docs/cli/options> e <https://www.better-t-stack.dev/docs/cli/compatibility>.

- `--backend self` é o modo fullstack: a API do tRPC roda dentro do Next, em `apps/web/src/app/api/trpc/[trpc]/route.ts`, e **não existe `apps/server`**. Com `self`, `--runtime none` é aceito.
- Se você não passar `--web-deploy none --server-deploy none`, o CLI pergunta interativamente o deploy e trava a execução não interativa. As duas flags são obrigatórias no comando.
- Versões geradas: Next `^16.4.6`, React `^19.3.1`, tRPC `^11.28.0` com `@trpc/tanstack-react-query`, `drizzle-orm` e `drizzle-kit` `1.0.0-rc.5` (API de relations v2 com `defineRelations`), `pg ^8.23.1`, zod `^4.6.7`, TypeScript `^6.0.3`, varlock `1.25.0` para variáveis de ambiente, e a UI em `packages/ui` (shadcn em cima de `@base-ui/react`, com `button`, `card`, `checkbox`, `input`, `textarea`, `label`, `dropdown-menu`, `sonner` e `skeleton`).
- Estrutura gerada: `apps/web`, `packages/api` (com `src/index.ts`, `src/context.ts` e `src/routers/index.ts`), `packages/db` (com `docker-compose.yml`, `drizzle.config.ts`, `src/schema/index.ts`, `src/relations.ts` e `src/migrations/`), `packages/ui`, `packages/config`. Workspaces do npm, sem Turborepo.
- Scripts da raiz: `dev`, `build`, `check-types`, `dev:web`, `db:push`, `db:generate`, `db:migrate`, `db:studio`, `db:start` (`docker compose up -d`), `db:stop`, `db:down`, `db:watch`, `env:generate`.
- O web roda em `http://localhost:3001` (`next dev --port 3001`).
- `docker-compose.yml` gerado: `image: postgres:18`, porta `5432:5432`, volume em `/var/lib/postgresql`, healthcheck `pg_isready`.
- `DATABASE_URL` fica em `apps/web/.env` (no `.gitignore`), com o esquema em `apps/web/.env.schema` (versionado). `packages/db/.env.schema` importa `DATABASE_*` do web.
- Ambiente: WSL Ubuntu, Node v24.20.0, npm 11.19.0. O SSH para o GitHub autentica como `luisrca-tech`. O Docker responde dentro do WSL (informado pelo Principal às 16:27: servidor 29.6.2). Nenhum container ocupa a 5432 e `ss -ltn` não mostra nada em 5432 nem em 3001.

### 2.2 Comando exato

```bash
cd /home/lfrca/projetos/personal-projects
npx -y create-better-t-stack@3.49.2 estudos-ia \
  --frontend next --backend self --runtime none \
  --api trpc --database postgres --orm drizzle --db-setup docker \
  --auth none --payments none --addons none --examples none \
  --web-deploy none --server-deploy none \
  --package-manager npm --install --git \
  --directory-conflict merge --disable-analytics --open none
```

**[Decisão]** Fixar `@3.49.2`, a versão testada, em vez de `@latest`. Assim o scaffold é igual ao que eu verifiquei. `--directory-conflict merge` resolve o caso da pasta que já existe vazia.

### 2.3 Ajustes logo depois do scaffold (primeiro commit separado)

1. **Banco** (`packages/db/docker-compose.yml`): troque `image: postgres:18` por `image: pgvector/pgvector:pg18` e a porta por `"5433:5432"`. Renomeie `POSTGRES_DB` para `estudos_ia`. Mantenha o volume em `/var/lib/postgresql`, que é o layout do PG 18.
2. Em `apps/web/.env`, defina `DATABASE_URL=postgresql://postgres:password@localhost:5433/estudos_ia`.
3. Dependências novas, todas no workspace certo:
   - raiz, `devDependencies`: `tsx`, `cheerio`, `turndown`, `@types/turndown`, `vitest`;
   - `packages/api`: `date-fns` e `@date-fns/tz`;
   - `apps/web`: `react-markdown` e `remark-gfm`.
4. Scripts novos na raiz: `"content:extract": "tsx scripts/extract-trilha.ts"`, `"db:seed": "npm run db:seed --workspace @estudos-ia/db --"` e `"test": "vitest run"`. Em `packages/db`: `"db:seed": "tsx src/seed.ts"`.
5. Use **migrations versionadas** (`db:generate` seguido de `db:migrate`), não `db:push`. Os arquivos ficam em `packages/db/src/migrations/` e entram no git.

**[Decisão] Por que trocar a imagem:** `pgvector/pgvector:pg18` é o Postgres 18 oficial com a extensão `vector` já instalada (confirmei a tag com `docker manifest inspect`). A V2 só precisa rodar `CREATE EXTENSION vector`, sem trocar de imagem nem migrar dados. Escolhi pg18 em vez do pg17 que o Principal deu de exemplo, porque o compose gerado já monta o volume no layout do PG 18; com pg17 seria preciso mudar o mount para `/var/lib/postgresql/data`.

**[Suposição] Porta 5433:** evita conflito com o Postgres de outros projetos (Entrelaços, Festejo) quando eles sobem localmente. Se a 5432 estiver sempre livre, pode voltar para ela.

### 2.4 Git e push

O `--git` faz o `git init`. O CLI não deixa claro se ele cria o primeiro commit, então os passos abaixo funcionam nos dois casos:

```bash
cd /home/lfrca/projetos/personal-projects/estudos-ia
git rev-parse --is-inside-work-tree || git init
git branch -M main
git add -A
git commit -m "chore: scaffold Better-T-Stack (next self, trpc, drizzle, postgres docker)" || true
git remote add origin git@github.com:luisrca-tech/estudos-ia.git
git push -u origin main
```

Os ajustes da 2.3 vão no segundo commit. Antes de cada commit, confira que nenhum `.env` está staged: ele já está no `.gitignore` gerado.

### 2.5 Decisão do banco

| Opção | Veredito |
|---|---|
| **Postgres 18 + pgvector em Docker, no WSL** | **Escolhida.** O Docker já funciona no WSL, o Better-T-Stack gera o compose e os scripts `db:start`/`db:stop`, a extensão `vector` já vem pronta para a V2 e os dados ficam num volume nomeado. Não instala nada no Ubuntu. |
| Postgres nativo no Ubuntu | Descartada pelo Principal (16:27). Também exigiria compilar ou instalar o pgvector à parte. |
| Neon, Supabase ou Prisma Postgres (`--db-setup`) | Descartada. O app é local e de um usuário só; depender da rede e de uma conta externa não traz ganho. |
| SQLite (Turso, libsql) | Descartada. O brief fixa Postgres, e o pgvector da V2 pede Postgres. |

Custo aceito: o app só funciona com o Docker Desktop aberto e o container de pé (`npm run db:start`). O README deve dizer isso.

---

## 3. Arquitetura e fluxo

```
content/modules/*.json ─┐   (extraídos 1x do HTML por scripts/extract-trilha.ts)
content/routines.json  ─┤
                        ▼
          packages/db/src/content/schema.ts (zod) ──► packages/db/src/seed.ts (upsert por slug)
                                                              │
apps/web (Next 16, App Router)                                ▼
  ├─ páginas (client components com useTRPC + react-query)   Postgres 18 + pgvector (Docker, :5433)
  └─ /api/trpc/[trpc] ──► packages/api/src/routers/* ──► packages/db (drizzle)
                                   └─ packages/api/src/rules/* (funções puras: revisão, alertas, períodos, import)
```

- **Regras de negócio são funções puras** em `packages/api/src/rules/`. Elas recebem dados e `now` e não acessam o banco. Os routers buscam os dados, chamam as regras e gravam o resultado. Isso deixa as regras testáveis com vitest sem banco e torna o comportamento determinístico.
- **Fuso:** a constante `APP_TZ = "America/Sao_Paulo"` fica em `packages/api/src/rules/time.ts`. Todas as datas de calendário (dia da revisão, chave de período, "hoje") são calculadas nesse fuso com `@date-fns/tz` (`TZDate`). Os timestamps são gravados como `timestamptz`.
- **Sem autenticação.** Todas as procedures são `publicProcedure`. O app só escuta em localhost.
- **Pontos de extensão para V1 e V2.** Ficam só como estrutura; nada disso é implementado na V0:
  - `packages/api/src/routers/index.ts` reserva os nomes `tutor` (V1) e `rag` (V2), que não são registrados.
  - O `content` do módulo, que é `jsonb`, é a fonte do contexto do tutor da V1. Isso não muda o schema.
  - `note.body` em texto puro é a fonte dos chunks da V2. A V2 cria `note_chunk(note_id, chunk, embedding vector(N))` numa migration própria.
  - `.env.schema` ganha `OPENROUTER_API_KEY` só na V1.

---

## 4. Conteúdo versionado e seed

### 4.1 Extração (uma única vez)

`scripts/extract-trilha.ts <caminho-do-html>` lê o HTML com `cheerio`. O HTML **não** entra no repositório nem é lido em runtime. O script grava:

- `content/modules/m01-fundamentos.json` … `content/modules/m14-governanca.json`, mais `content/modules/casos-mundo-real.json` (15 arquivos);
- `content/routines.json`.

Ele roda uma vez, e o resultado é revisado no diff e commitado. Depois disso, quem manda é o JSON: edições manuais nos JSONs são legítimas, e o script não roda de novo, a menos que o HTML seja reescrito.

Mapeamento do HTML (classes e ids verificados no arquivo):

| Campo | Origem no `<section id="mN">` |
|---|---|
| `key` | `id` da section (`m1`…`m14`, `casos`), igual ao `data-note` |
| `part` | 1 para m1–m10 e 2 para m11–m14 e `casos` |
| `order` | 1–14; `casos` = 15 |
| `kicker` | `p.kicker` (por exemplo `Módulo 6 · O mais importante`) |
| `title` | `h2` |
| `lead` | `p.lead` |
| `prerequisites` | `p.pre` (só na Parte 2), ou `null` |
| `seen` | `li` de `.box.seen` |
| `new` | `li` de `.box.new` |
| `decisionQuestions` | `li` de `.box.q`. Em `casos`, os `li` de `.ex ol` ("Como estudar um caso") |
| `readings` | cada `ul.src > li`, mais as linhas da tabela de casos em `casos` |
| `exercise` | `.ex p` (em `casos`, `null`) |
| `seeds` | `.box.seed p`, ou `null`. Nos m1–m10 é "Semente para a Parte 2"; nos m11–m14, "Desde a Parte 1" |

Os trechos com HTML interno (`<b>`, `<a>`) são convertidos para Markdown com `turndown`, então links e negrito sobrevivem.

Cada leitura é extraída assim:

- `kind` vem do texto do `span.t` (Vídeo, Paper, Artigo, Docs…);
- `title` é o texto Markdown do `div` sem os spans `.mins` e `.why`; alguns itens têm dois links, como CoT e Self-Consistency;
- `url` é o primeiro `href`;
- `duration` vem do `.mins`, sem o `· `;
- `why` vem do `.why`;
- `grade` segue a regra abaixo.

**[Suposição] `grade`:** o HTML não traz grau por leitura. O script preenche `B` para `kind ∈ {Paper, Pesquisa}`, `C` para as linhas da tabela de casos (o próprio HTML diz que são grau C) e `null` para o resto. O Luis ajusta no JSON se quiser.

Contagens que o script deve conferir, e falhar se não baterem: 15 módulos, e 14 deles com `.box.q`, `.box.seen`, `.box.new` e `.box.seed` (os m1–m14).

### 4.2 Formato do arquivo de módulo

`content/modules/m06-avaliacao.json`:

```json
{
  "schemaVersion": 1,
  "slug": "m06-avaliacao",
  "key": "m6",
  "part": 1,
  "order": 6,
  "kicker": "Módulo 6 · O mais importante",
  "title": "Avaliação: a habilidade que separa engenharia de achismo",
  "lead": "…",
  "prerequisites": null,
  "seen": ["…"],
  "new": ["**Análise de erros primeiro:** …"],
  "decisionQuestions": ["…"],
  "readings": [
    { "kind": "Artigo", "title": "[Your AI Product Needs Evals](https://hamel.dev/…), Hamel Husain", "url": "https://hamel.dev/…", "duration": "40 min", "why": "…", "grade": null }
  ],
  "exercise": "…",
  "seeds": "…"
}
```

Slugs (**[Suposição]**, kebab-case com zero à esquerda): `m01-fundamentos`, `m02-controle`, `m03-contexto-memoria`, `m04-recuperacao`, `m05-ferramentas-aci`, `m06-avaliacao`, `m07-harness`, `m08-seguranca`, `m09-observabilidade`, `m10-economia-escala`, `m11-adaptacao-dados`, `m12-inferencia-latencia`, `m13-produto-feedback`, `m14-governanca`, `casos-mundo-real`. **O nome do arquivo é igual ao `slug`.**

**Regra:** `slug` e `key` são imutáveis depois do primeiro seed. Renomear um slug equivale a remover um módulo e criar outro: o antigo é arquivado e as notas ficam presas a ele. `key` é o que liga o módulo ao export do HTML.

### 4.3 Schema zod (`packages/db/src/content/schema.ts`)

```ts
export const gradeSchema = z.enum(["A", "B", "C", "D", "E"]);
export const readingSchema = z.object({
  kind: z.string().min(1),
  title: z.string().min(1),          // markdown
  url: z.url(),
  duration: z.string().nullable(),
  why: z.string().nullable(),
  grade: gradeSchema.nullable(),
});
export const moduleContentSchema = z.object({
  schemaVersion: z.literal(1),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  key: z.string().regex(/^[a-z0-9]+$/),
  part: z.union([z.literal(1), z.literal(2)]),
  order: z.number().int().positive(),
  kicker: z.string().min(1),
  title: z.string().min(1),
  lead: z.string().nullable(),
  prerequisites: z.string().nullable(),
  seen: z.array(z.string()),
  new: z.array(z.string()),
  decisionQuestions: z.array(z.string()),
  readings: z.array(readingSchema),
  exercise: z.string().nullable(),
  seeds: z.string().nullable(),
});
export const routineItemSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  cadence: z.enum(["daily", "weekly", "monthly"]),
  order: z.number().int().positive(),
  label: z.string().min(1),
  hint: z.string().nullable(),
});
export const routinesFileSchema = z.object({ schemaVersion: z.literal(1), items: z.array(routineItemSchema) });
```

Validações entre arquivos, feitas no seed antes de qualquer escrita:

- `slug` é igual ao nome do arquivo sem `.json`;
- `slug`, `key` e `(part, order)` são únicos;
- os slugs das rotinas são únicos.

Se qualquer arquivo falhar, o seed sai com código 1, lista os erros (arquivo e caminho zod) e **não grava nada**.

### 4.4 `content/routines.json` (conteúdo da seção "método" do HTML)

| slug | cadence | order | label |
|---|---|---|---|
| `daily-recall` | daily | 1 | Responder de cabeça 3 perguntas de revisão (5 min) |
| `daily-read-one` | daily | 2 | Ler ou assistir **uma** seção de uma fonte (15–20 min) |
| `daily-concept-note` | daily | 3 | Fechar a fonte e escrever uma nota de conceito (10–15 min) |
| `weekly-exercise` | weekly | 1 | Um exercício prático do módulo da semana num projeto real |
| `weekly-decision` | weekly | 2 | Uma ficha de decisão sobre algo que você escolheu ou vai escolher |
| `weekly-prune` | weekly | 3 | Rever as notas e cortar o que não usaria |
| `monthly-synthesis` | monthly | 1 | Escrever um texto de síntese |
| `monthly-blind-review` | monthly | 2 | Pedir uma revisão cega a um agente |
| `monthly-playbook` | monthly | 3 | Atualizar o guia "por onde começar" com o que aprendeu |

`hint` recebe o tempo do ritmo: `30–45 min` (diário), `2–3 h` (semanal) e `meio dia` (mensal).

### 4.5 Seed idempotente (`packages/db/src/seed.ts`, `npm run db:seed`)

```
1. ler todos os content/modules/*.json e content/routines.json
2. validar tudo (4.3); se houver erro → exit 1, sem escrita
3. hash = sha256(conteúdo do arquivo com \r\n normalizado para \n), em hex
4. numa única transação:
   para cada módulo do arquivo:
     upsert em module por slug:
       set key, part, order, title, content = objeto validado, content_hash = hash,
           archived_at = NULL, updated_at = now()
     se o módulo é novo ou o hash mudou: insert em module_content_version (module_id, hash, content)
   módulos no banco com slug fora dos arquivos e archived_at NULL → archived_at = now()
   mesmo processo para routine_item (upsert por slug; ausentes → archived_at = now())
5. imprimir um resumo: criados N, atualizados N, sem mudança N, arquivados N
```

Garantias:

- O seed só escreve em `module`, `module_content_version` e `routine_item`. Ele **nunca** escreve em `note`, `study_session`, `review_schedule`, `review_log`, `routine_check`, `module_progress` nem `import_batch`.
- Rodar duas vezes sem mudar nada dá `criados 0, atualizados 0, arquivados 0` e não cria versão nova.
- Um módulo arquivado que volta aos arquivos é desarquivado (`archived_at = NULL`).
- **Nada é apagado.** Todas as FKs de dados do usuário para `module` usam `onDelete: "restrict"`.

### 4.6 Passo a passo no README do projeto: "Como adicionar um módulo (m15 em diante)"

1. Copie um arquivo de `content/modules/`, por exemplo para `content/modules/m15-novo-tema.json`.
2. Preencha `slug` (igual ao nome do arquivo), `key` (`m15`), `part`, `order` (o próximo livre) e o conteúdo.
3. Rode `npm run db:seed`. O validador mostra o erro se faltar algum campo.
4. Pronto: não há migration, porque o conteúdo vive em `module.content` (`jsonb`).
5. Para remover um módulo, apague o arquivo e rode o seed. Ele é **arquivado**, e as notas continuam acessíveis em "Arquivados".
6. Para editar um módulo, edite o JSON e rode o seed. O hash muda, uma `content_version` nova é gravada e a página do módulo mostra o aviso "conteúdo atualizado".

---

## 5. Schema Drizzle (`packages/db/src/schema/*.ts`)

IDs `uuid` com `defaultRandom()`. Timestamps `timestamp({ withTimezone: true })` com `defaultNow()`. As relações ficam em `relations.ts` com `defineRelations`, seguindo o padrão gerado (drizzle 1.0 rc).

```ts
// enums
noteType      = pgEnum("note_type", ["summary", "question", "decision", "evidence"])
noteSource    = pgEnum("note_source", ["app", "html_import"])
sessionStatus = pgEnum("session_status", ["running", "completed", "cancelled"])
cadence       = pgEnum("cadence", ["daily", "weekly", "monthly"])
reviewResult  = pgEnum("review_result", ["recalled", "forgot"])
```

| Tabela | Campos | Índices e restrições |
|---|---|---|
| `module` | `id`, `slug text`, `key text`, `part smallint`, `order smallint`, `title text`, `content jsonb` (tipado como `ModuleContent`), `content_hash text`, `archived_at timestamptz null`, `created_at`, `updated_at` | `unique(slug)`, `unique(key)` |
| `module_content_version` | `id`, `module_id → module`, `hash text`, `content jsonb`, `created_at` | `unique(module_id, hash)` |
| `module_progress` | `module_id → module` (PK), `mastery_level smallint default 0` (0–5, a escada do método), `last_seen_content_hash text null`, `updated_at` | `check(mastery_level between 0 and 5)` |
| `note` | `id`, `module_id → module`, `session_id → study_session null` (`onDelete: set null`), `type note_type`, `title text`, `body text` (markdown), `recall_prompt text null`, `evidence_grade char(1) null` (A–E), `source_url text null`, `source note_source default 'app'`, `import_batch_id → import_batch null`, `created_at`, `updated_at` | `index(module_id, created_at)`, `index(type)`, `check(evidence_grade in A–E)` |
| `study_session` | `id`, `module_id → module`, `planned_minutes smallint`, `started_at`, `ends_at timestamptz` (= started_at + planned), `ended_at null`, `duration_seconds int null`, `status session_status` | índice único parcial `on (status) where status = 'running'`, que garante uma única sessão ativa |
| `review_schedule` | `note_id → note` (PK, `onDelete: cascade`), `step smallint` (0–4), `due_on date null`, `graduated_at null`, `created_at`, `updated_at` | `index(due_on)` |
| `review_log` | `id`, `note_id → note` (cascade), `step_before smallint`, `result review_result`, `reviewed_at` | `index(note_id)` |
| `routine_item` | `id`, `slug text`, `cadence`, `order smallint`, `label text`, `hint text null`, `archived_at null`, `created_at`, `updated_at` | `unique(slug)` |
| `routine_check` | `id`, `routine_item_id → routine_item`, `period_key text` (`2026-11-19`, `2026-W47`, `2026-11`), `checked_at` | `unique(routine_item_id, period_key)` |
| `import_batch` | `id`, `file_name text`, `format text` (`markdown` ou `json`), `file_hash text`, `notes_created int`, `notes_skipped int`, `created_at` | — |

Observações:

- Notas são apagáveis pelo usuário: `note.delete` faz cascade em `review_schedule` e `review_log`. Nada apaga `module`.
- `module_progress` é criado de forma preguiçosa: um upsert no primeiro acesso ou na primeira alteração.
- Não existe tabela de alertas. Os alertas são **derivados** na leitura (seção 6.1), o que evita estado inconsistente.

---

## 6. Regras exatas (`packages/api/src/rules/`)

Definições usadas em todas as regras:

- `today(now)` é a data `YYYY-MM-DD` de `now` em `APP_TZ`;
- `addDays(date, n)` é aritmética de calendário em `APP_TZ`.

### 6.1 Cobrança de resumo próprio (`summary-alerts.ts`)

Uma sessão **conta** quando `status = 'completed'` e `duration_seconds >= 300`. **[Suposição]** Sessões de menos de 5 minutos não geram cobrança.

Para uma sessão S que conta, com `deadline = S.ended_at + 24h` (24 horas corridas, não dias de calendário):

```
coberta(S) = existe nota N com N.type = 'summary' e N.source = 'app' e
             ( N.session_id = S.id
               ou (N.module_id = S.module_id e S.started_at <= N.created_at <= deadline) )

estado(S, now) =
  'covered'  se coberta(S)
  'pending'  se não coberta e now <  deadline   → aparece em "Hoje" como "escrever resumo (faltam Xh)"
  'overdue'  se não coberta e now >= deadline   → ALERTA em "Hoje" (vermelho), com "atrasado há Xh"
```

- Uma nota importada (`source = 'html_import'`) **nunca** cobre uma sessão.
- Um alerta `overdue` some quando o Luis escreve um resumo com `session_id = S.id`. O botão "Escrever resumo" do alerta já abre o editor com `type = summary` e `sessionId = S.id`. Ele também some se a sessão for cancelada depois.
- Ao criar uma nota `summary` sem `sessionId`, o router vincula automaticamente a sessão que conta mais recente do mesmo módulo que esteja `pending` ou `overdue`, se houver.
- Janela de busca: o painel avalia só as sessões com `ended_at >= now - 30 dias`. Sessões mais antigas não geram alerta.

### 6.2 Revisão espaçada (`review.ts`)

Intervalos cumulativos de 1, 3, 7 e 21 dias, aplicados como **gaps a partir da última revisão feita**: `GAPS = [1, 2, 4, 14]`. Se as revisões forem feitas em dia, elas caem nos dias 1, 3, 7 e 21 depois da criação. Se uma atrasar, as seguintes andam junto.

```
ao criar uma nota (qualquer tipo, source 'app' ou 'html_import' com body não vazio):
  review_schedule = { step: 0, due_on: addDays(today(created_at), 1), graduated_at: null }

ao revisar (input: result), com s = step atual:
  insert review_log(step_before = s, result)
  se result = 'forgot':   step = 0; due_on = addDays(today(now), GAPS[0])        // volta para 1 dia
  se result = 'recalled':
     se s = 3: step = 4; due_on = null; graduated_at = now                      // fez as revisões de 1, 3, 7 e 21 dias
     senão:    step = s + 1; due_on = addDays(today(now), GAPS[s + 1])

devidas(now) = review_schedule com due_on <= today(now) e graduated_at null,
               de notas cujo módulo pode estar arquivado (a nota continua do usuário)
```

**Ordem do dia (intercalação, como o método pede):** primeiro as atrasadas (`due_on < hoje`), depois as de hoje. Dentro de cada grupo, round-robin por `module_id`, com os módulos ordenados por `order` e as notas por `due_on` e depois `created_at`.

**Pergunta de recordação, a regra exata do que aparece antes de revelar:**

1. Se `note.recall_prompt` não estiver vazio, mostra ele.
2. Senão, por tipo:
   - `summary`: `Explique com suas palavras: "{title}" ({kicker do módulo}).`
   - `question`: o próprio `title`.
   - `decision`: `Que decisão você tomou sobre "{title}", e o que te faria mudar de ideia?`
   - `evidence`: `Qual é a evidência de "{title}", e com que grau (A–E)?`

A tela mostra só a pergunta e o módulo. O corpo da nota fica oculto até o clique em **Revelar** (estado de cliente). Depois de revelar, aparecem os botões **Lembrei** e **Não lembrei**. Não dá para avaliar sem revelar.

Editar uma nota não muda a agenda. Apagar a nota apaga a agenda.

### 6.3 Rotinas e períodos (`periods.ts`)

```
periodKey('daily',   now) = format(now em APP_TZ, 'yyyy-MM-dd')
periodKey('weekly',  now) = format(now em APP_TZ, "RRRR-'W'II")   // semana ISO, segunda a domingo
periodKey('monthly', now) = format(now em APP_TZ, 'yyyy-MM')
```

- Marcar um item insere `routine_check(item, periodKey(cadence, now))`. Com o `unique`, marcar de novo não faz nada.
- Desmarcar apaga o check **do período atual**. Checks de períodos passados são histórico e não podem ser alterados na V0.
- Um período está "completo" quando todos os itens não arquivados da cadência têm check nele.
- O histórico lista, por cadência, os últimos 30 dias, as últimas 12 semanas ou os últimos 12 meses, com `feitos/total` e os itens marcados.

### 6.4 Cronômetro (`sessions`)

- `sessions.start({ moduleId, plannedMinutes })` aceita `plannedMinutes ∈ [5, 180]`, com padrão **25** (**[Suposição]**) e atalhos de 15, 25 e 45 min. Se já houver uma sessão `running`, retorna `CONFLICT`; o índice parcial garante isso.
- O cliente calcula o tempo restante como `ends_at - Date.now()`, com tick de 1 s. Não acumula ticks, então recarregar a página ou fechar e abrir de novo não perde a sessão: `sessions.active` devolve a sessão em andamento.
- Quando `Date.now() >= ends_at`:
  1. toca um som de cerca de 1,5 s gerado com Web Audio (`OscillatorNode`, três bipes), sem arquivo de áudio;
  2. se `Notification.permission === 'granted'`, cria `new Notification("Sessão concluída", { body: "{kicker}: escreva seu resumo com suas palavras.", tag: sessionId, requireInteraction: true })`, e o clique foca a aba e abre o editor de resumo;
  3. chama `sessions.complete({ id })`, que grava `ended_at = now()`, `duration_seconds = ends_at - started_at` em segundos e `status = completed`.
- O botão **Concluir agora** faz `complete` com `duration_seconds = now - started_at`. O botão **Cancelar** grava `status = cancelled`.
- Se o app abrir com uma sessão `running` cujo `ends_at` já passou há mais de 1 minuto (aba estava fechada), ela é concluída na hora com `ended_at = ends_at`, sem som.
- A permissão de notificação é pedida **no clique** de "Iniciar sessão", na primeira vez, porque os navegadores exigem um gesto do usuário. Se ela for negada, a página mostra um aviso fixo e o som continua.

**[Fato com limite]** O Chrome e o Edge reduzem os timers de abas em segundo plano, e por isso o aviso pode chegar alguns segundos depois do fim, até cerca de 1 minuto em abas ocultas há muito tempo. Isso não foi testado neste ambiente. Os dados não se perdem, porque `duration_seconds` vem de `ends_at`. O app roda em `localhost:3001`, que conta como contexto seguro, então a Notification API funciona. O navegador no Windows alcança o Next no WSL pelo encaminhamento de localhost do WSL (não testado; é o caminho padrão).

### 6.5 Importação (`import-parser.ts`)

**Markdown (export do HTML):**

```
1. normalizar \r\n → \n
2. cabeçalhos válidos = para cada módulo (incluindo arquivados): "## " + content.kicker + " · " + content.title
   (com ou sem " ✓" no fim)
3. percorrer as linhas; uma linha só abre uma seção se for EXATAMENTE um cabeçalho válido.
   Qualquer outro "## " (de uma nota do Luis) fica no corpo da seção atual.
4. corpo = linhas até o próximo cabeçalho válido, com trim
5. ignorar a seção se corpo = "_(sem anotações)_" ou vazio
6. done = cabeçalho termina com " ✓"
7. a linha "Exportado em …" e o título "# Trilha…" antes do primeiro cabeçalho são ignorados
8. cabeçalho não reconhecido → aviso "seção não mapeada", não erro
```

**JSON alternativo:** `{ [key]: string }`, ou `{ notes: { [key]: string }, done?: { [key]: boolean } }`. As chaves que não forem `module.key` geram aviso.

**Gravação** (`importer.commit`, numa transação):

- Para cada seção, crie uma nota com `type = 'summary'`, `source = 'html_import'`, `title = "Anotações do HTML (importadas em dd/MM/yyyy)"`, `body` igual ao corpo, `import_batch_id` preenchido e a agenda de revisão da 6.2, **com escalonamento (decisão do Luis, 19/11)**: as notas importadas do lote, na ordem dos módulos (`order`), recebem `due_on` escalonado com no máximo 3 por dia: as 3 primeiras em `hoje + 1`, as 3 seguintes em `hoje + 2`, e assim por diante. Isso vale só para a primeira revisão de notas `html_import`; depois a agenda segue a 6.2 normalmente. Critério de aceite extra: importar 15 notas deixa no máximo 3 revisões devidas por dia vindas do import.
- **Idempotência:** se já existe uma nota `html_import` do mesmo módulo com o mesmo `body` (comparado depois do trim), pule a seção e conte em `notes_skipped`.
- Se `done = true`, faça `module_progress.mastery_level = max(atual, 3)`, porque o ✓ é "Cheguei ao degrau 3".
- O fluxo tem dois passos: `importer.preview` (só faz o parse e devolve, por módulo, o tamanho, se é duplicata e o ✓) e depois `importer.commit`.
- O arquivo é lido no cliente com `File.text()` e enviado como string. Limite de 1 MB, validado com zod.

---

## 7. API tRPC (`packages/api/src/routers/`)

Cada router fica num arquivo. Todas as inputs são validadas com zod. Erros: `NOT_FOUND`, `CONFLICT` e `BAD_REQUEST`.

| Router | Procedure | Tipo | Input | Saída e efeito |
|---|---|---|---|---|
| `modules` | `list` | query | `{ includeArchived?: boolean }` | módulos por `part, order`, com `masteryLevel`, `noteCount`, `lastSessionAt` e `contentChanged` (`last_seen_content_hash` preenchido e diferente de `content_hash`) |
| | `bySlug` | query | `{ slug }` | módulo com `content`, `progress`, `contentChanged`, `contentUpdatedAt` (a versão mais recente) |
| | `markContentSeen` | mutation | `{ moduleId }` | `last_seen_content_hash = content_hash`; no primeiro acesso a página já chama isso, para não mostrar o aviso indevidamente |
| | `setMastery` | mutation | `{ moduleId, level: 0–5 }` | atualiza `module_progress` |
| `notes` | `listByModule` | query | `{ moduleId, type? }` | notas, da mais nova para a mais antiga |
| | `byId` | query | `{ id }` | nota com o módulo |
| | `create` | mutation | `{ moduleId, type, title (1–200), body (1–50k), recallPrompt?, evidenceGrade?, sourceUrl?, sessionId? }` | cria a nota e a `review_schedule`; vincula a sessão automaticamente (6.1) |
| | `update` | mutation | `{ id, ...campos editáveis }` | atualiza, sem mexer na agenda |
| | `delete` | mutation | `{ id }` | apaga em cascata |
| `sessions` | `active` | query | — | a sessão `running` (com o módulo) ou `null`; aplica a autoconclusão da 6.4 |
| | `start` | mutation | `{ moduleId, plannedMinutes }` | cria a sessão, ou `CONFLICT` |
| | `complete` | mutation | `{ id, early?: boolean }` | conclui |
| | `cancel` | mutation | `{ id }` | cancela |
| | `list` | query | `{ moduleId?, limit = 50 }` | histórico com o estado de resumo de cada sessão (6.1) |
| `reviews` | `due` | query | — | fila do dia na ordem da 6.2, com `{ noteId, prompt, moduleKicker, step, dueOn, overdue }`, sem o `body` |
| | `reveal` | query | `{ noteId }` | `body`, `title`, `type`, `evidenceGrade` |
| | `grade` | mutation | `{ noteId, result }` | aplica a 6.2; `BAD_REQUEST` se a nota não estiver devida |
| `routines` | `current` | query | — | por cadência: itens, `periodKey` e marcados no período atual |
| | `toggle` | mutation | `{ routineItemId, checked }` | marca ou desmarca no período atual |
| | `history` | query | `{ cadence }` | 6.3 |
| `today` | `get` | query | — | agregado do painel: `{ date, activeSession, summaryAlerts: {overdue[], pending[]}, reviewsDue: {count, overdueCount}, routines: {daily, weekly, monthly}, suggestedModule }` |
| `importer` | `preview` | mutation | `{ fileName, text }` | parse (6.5), sem gravar |
| | `commit` | mutation | `{ fileName, text }` | grava; devolve `{ created, skipped, masteryUpdated }` |

`suggestedModule` é o módulo da última sessão que conta. Se não houver sessão, é o primeiro módulo não arquivado com `mastery_level < 3`, por `order`.

---

## 8. Telas e rotas (`apps/web/src/app/`)

O layout tem um header com a navegação (Hoje · Módulos · Revisões · Rotinas · Sessões · Importar) e um **timer global** que aparece em qualquer página enquanto há sessão ativa. Ele mostra o tempo restante, o módulo e os botões Concluir e Cancelar. Use os componentes de `packages/ui`. O tema claro/escuro já vem no scaffold.

| Rota | Conteúdo |
|---|---|
| `/` (Hoje) | 1) a data de hoje; 2) **Alertas**: resumos `overdue` em destaque, com botão "Escrever resumo"; 3) **Revisões de hoje**: contagem (com as atrasadas à parte) e botão "Começar revisão" para `/reviews`; 4) **Rotina de hoje**: checklist diário; e, compactas, a semana e o mês com os itens pendentes; 5) **Resumos pendentes** (`pending`, "faltam Xh"); 6) **Estudar agora**: módulo sugerido, botão "Iniciar sessão de 25 min" e seletor de módulo. Estado vazio sem nada pendente: "Tudo em dia." |
| `/modules` | lista em duas seções (Parte 1 e Parte 2). Cada card mostra kicker, título, degrau (0–5), número de notas e o selo "conteúdo atualizado". Os arquivados ficam numa seção recolhida no fim. |
| `/modules/[slug]` | cabeçalho (kicker, título, lead, pré-requisitos), seletor de degrau com os 5 rótulos da escada e o aviso "conteúdo atualizado em dd/MM", que some no "Ok". Abas ou blocos: **Perguntas de decisão**, **Leituras** (link externo `target=_blank`, tipo, duração, porquê e grau), Já visto / Novo (recolhidos), Exercício, Sementes. **Notas**: filtro por tipo, lista e botão "Nova nota". **Sessões** do módulo. Botão "Iniciar sessão". Os textos do conteúdo são renderizados com `react-markdown`. |
| `/modules/[slug]/notes/new?type=summary&sessionId=…` | editor: tipo (4 opções), título, corpo (textarea monoespaçada com aba "Pré-visualizar" em `react-markdown` + `remark-gfm`), pergunta de revisão, grau (A–E, opcional) e URL da fonte (opcional; aparece em destaque no tipo `evidence`). Para `summary`, o placeholder traz o modelo de nota de conceito do HTML (Afirmação · Mecanismo · Use quando / Não use quando · Alternativa mais simples · Evidência · Como eu verificaria · Pergunta de revisão). Para `decision`, traz o modelo ADR (Contexto · Opções · Escolha · Evidência · Custo aceito · O que me faria mudar de ideia · Data). |
| `/notes/[id]` | o mesmo editor, em modo edição, com o botão Apagar (pede confirmação) |
| `/reviews` | uma revisão por vez: módulo, pergunta e o botão **Revelar**, que mostra o corpo e libera **Lembrei** e **Não lembrei**. Avaliar passa para a próxima. Mostra o progresso "3 de 8". Quando acaba: "Revisões de hoje concluídas." |
| `/routines` | três colunas (Diária, Semanal, Mensal) com o período atual (por exemplo `Semana 2026-W47`) e as caixas, mais o histórico abaixo de cada uma (6.3) |
| `/sessions` | histórico: data, módulo, planejado e real, status e estado de resumo (coberto, pendente ou atrasado), com o link "Escrever resumo" quando falta |
| `/import` | upload de `.md` ou `.json`, a tabela de prévia (módulo, caracteres, ✓, "já importado") e o botão Importar, seguido do resultado. Inclui o snippet de console da 8.1 para quem quiser o JSON. |

### 8.1 Snippet para exportar o `localStorage` como JSON (texto de ajuda na tela `/import`)

```js
copy(JSON.stringify({notes:Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('trilha-ia-v3:note:')).map(k=>[k.slice(18),localStorage[k]])),done:Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('trilha-ia-v3:done:')).map(k=>[k.slice(18),localStorage[k]==='1']))}))
```

Ele é rodado no console do navegador com o HTML da trilha aberto. O prefixo `trilha-ia-v3:` foi conferido no JS do arquivo.

---

## 9. Fatias de implementação (ordem e dependências)

| # | Fatia | Depende de | Estimativa |
|---|---|---|---|
| S1 | Scaffold (2.2), primeiro commit e push (2.4), ajustes de banco e dependências (2.3), `db:start` ok | — | 20 min |
| S2 | Schema e relations, `db:generate` + `db:migrate` | S1 | 25 min |
| S3 | `scripts/extract-trilha.ts`, os 15 JSONs + `routines.json` commitados, schema zod, `seed.ts` | S2 | 50 min |
| S4 | `rules/` (time, periods, review, summary-alerts, import-parser) com testes vitest | S1 | 45 min |
| S5 | Routers tRPC (seção 7) | S2, S4 | 45 min |
| S6 | Telas: layout e timer global, `/modules`, `/modules/[slug]`, editor de notas | S5 | 60 min |
| S7 | `/` Hoje, `/reviews`, `/routines`, `/sessions`, `/import` | S5, S6 | 60 min |
| S8 | README (como subir, como adicionar um módulo da 4.6, backup do volume), `npm run check-types`, `npm test`, commit e push | tudo | 15 min |

Total estimado de 5 a 6 horas (**[Suposição]**, sem medição). Se o tempo apertar, as primeiras coisas a cortar são o histórico de rotinas (fica só o período atual) e `/sessions` (o histórico continua na página do módulo). O resto é o núcleo do método.

---

## 10. Riscos

| Risco | Mitigação |
|---|---|
| A extração do HTML erra algum campo (HTML com marcação irregular) | contagens obrigatórias no script (4.1), revisão do diff dos JSONs antes do commit, zod no seed |
| `drizzle-orm 1.0.0-rc.5` é release candidate | é a versão que o scaffold fixou; não atualize no meio da V0; relations com `defineRelations` como no template |
| O timer atrasa em aba de segundo plano | `ends_at` no servidor; o aviso pode atrasar, mas a duração fica correta (6.4) |
| Docker parado, app sem banco | o README diz para rodar `npm run db:start`; o healthcheck do compose já existe |
| Perda de dados (volume Docker) | o README mostra o comando de backup: `docker exec estudos-ia-postgres pg_dump -U postgres estudos_ia > backup.sql`. Use o nome do container que o scaffold gerar. |
| Import duplicado | idempotência por `(module, body)` (6.5) |

---

## 11. Critérios de aceite (testáveis pelo QA)

**Setup e conteúdo**

1. Com o repo limpo, `npm install && npm run db:start && npm run db:migrate && npm run db:seed && npm run dev` sobe o app em `http://localhost:3001` sem erro. `git log` em `origin/main` mostra pelo menos o commit do scaffold.
2. `docker compose ps`, rodado em `packages/db`, mostra a imagem `pgvector/pgvector:pg18`. Dentro do banco, `select * from pg_available_extensions where name='vector'` retorna 1 linha.
3. Depois do seed, `/modules` mostra 10 módulos na Parte 1 e 5 na Parte 2 (m11–m14 e "Como as empresas aplicam estes conceitos"). Os títulos são iguais aos `<h2>` do HTML.
4. `/modules/m06-avaliacao` mostra as perguntas de decisão e as leituras com links clicáveis, iguais ao HTML (conferir pelo menos 2 links).
5. Rodar `npm run db:seed` de novo imprime `criados 0, atualizados 0, arquivados 0`, e a contagem de `module_content_version` não muda.
6. Crie uma nota em m1, edite o `title` de `m01-fundamentos.json` e rode o seed. O título muda, a nota continua, existe uma `module_content_version` nova e a página mostra "conteúdo atualizado".
7. Mova `m14-governanca.json` para fora da pasta e rode o seed. O m14 aparece em "Arquivados", as notas dele continuam abrindo e nenhuma linha de `note` foi apagada. Volte o arquivo, rode o seed, e o m14 volta para a lista.
8. Adicione `m15-teste.json` válido e rode o seed. O m15 aparece sem nenhuma migration nova.
9. Um JSON com `url` inválida faz o seed sair com código 1, citando arquivo e campo. Nenhuma tabela muda.

**Notas**

10. É possível criar notas dos 4 tipos com corpo em Markdown. A pré-visualização mostra lista, negrito e link.
11. Editar e apagar uma nota funcionam. Apagar pede confirmação.

**Importação**

12. Importar um `anotacoes-trilha-ia.md` exportado do HTML com notas em m1 e em `casos` cria 2 notas `html_import`. Seções `_(sem anotações)_` são ignoradas. Um módulo com ✓ fica com degrau ≥ 3.
13. Importar o mesmo arquivo de novo cria 0 notas e conta tudo como `skipped`.
14. Uma nota que contém uma linha `## Minha seção` dentro do texto é importada inteira, sem ser cortada.
15. O JSON do snippet da 8.1 também importa.

**Sessão e cobrança**

16. Iniciar uma sessão de 5 min em m2 pede a permissão de notificação no primeiro uso. Ao fim, toca o som, aparece a notificação do Windows "Sessão concluída" e a sessão fica `completed`, com `duration_seconds = 300`.
17. Iniciar uma segunda sessão com uma já ativa mostra um erro, e não é criada outra.
18. Recarregar a página durante a sessão mantém o tempo restante certo (±2 s).
19. Logo depois da sessão do item 16, "Hoje" mostra m2 em "Resumos pendentes". Se `ended_at` for alterado no banco para 25 h atrás, "Hoje" mostra o alerta atrasado. Escrever um `summary` pelo botão do alerta faz o alerta sumir.
20. Uma sessão cancelada, ou com menos de 5 min, não gera cobrança.

**Revisão**

21. Uma nota criada hoje não aparece em `/reviews` hoje. Com `due_on` ajustado para hoje, ela aparece mostrando **só** a pergunta. O corpo só aparece depois de "Revelar".
22. Testes unitários (vitest) de `review.ts`: com a nota criada em D e todas as respostas "lembrei" no dia devido, as datas são D+1, D+3, D+7 e D+21, e depois `graduated`. "Não lembrei" em qualquer passo agenda para amanhã com `step = 0`.
23. Com revisões devidas em m1, m1, m3, a ordem é m1, m3, m1 (intercalação).

**Rotinas**

24. Marcar os 3 itens diários mostra o dia completo. No dia seguinte (ou mudando a data do sistema ou um `now` de teste), os itens aparecem desmarcados, e o histórico mostra o dia anterior com 3/3.
25. Testes unitários de `periods.ts`: `2026-11-19T02:30:00Z` (23:30 do dia 18 em São Paulo) dá a chave diária `2026-11-18`. `2026-11-19` dá a semana `2026-W47`. `2026-12-31` e `2027-01-01` dão `2026-W53` (2026 tem 53 semanas ISO; conferido com um cálculo ISO em Node). `2026-11` é a chave mensal de qualquer dia de novembro.

**Qualidade**

26. `npm run check-types` e `npm test` passam. Nenhuma procedure exige autenticação. Nenhuma variável de ambiente nova além de `DATABASE_URL`.

---

## 12. Fora da V0

- Qualquer IA: o tutor por módulo via OpenRouter (V1), RAG sobre as notas com pgvector e os evals dos limites do tutor (V2). Na V0 só ficam os pontos de extensão da seção 3.
- Autenticação, múltiplos usuários, deploy, acesso pelo celular.
- Sincronização de volta com o HTML ou com o `localStorage`.
- Notificações com o app fechado (service worker ou push), lembretes agendados e integração com o calendário.
- Editor rico (WYSIWYG), anexos, tags, busca full-text.
- Algoritmo de revisão adaptativo (SM-2 ou FSRS), notas de 3 níveis e cards separados da nota.
- Edição de checks de rotina em períodos passados, estatísticas e gráficos, streaks.
- Os tipos de nota "experimento" e "falha" do HTML. A V0 segue os 4 tipos do brief; os dois podem entrar depois como novos valores do enum, numa migration simples.
- As seções que não são módulos ("Plano de 12 semanas", "Por onde começar", "Fontes para o dia a dia").

## Escuta (tradeoffs que valem a sua atenção, Luis)

- **Gaps relativos × datas fixas na revisão:** escolhi que um atraso empurra as próximas revisões. É mais justo com a memória, mas o "dia 21" deixa de ser o dia 21 do calendário se você atrasar.
- **"Não lembrei" volta para o passo 0:** isso é rígido. Se em uma semana parecer punitivo demais, a alternativa simples é voltar um passo só.
- **Decisão do Luis (19/11):** as três escolhas abaixo foram aprovadas. Revisão por intervalos a partir da última revisão: mantida. "Não lembrei" volta para 1 dia: mantido. Import: escalonado em no máximo 3 por dia (ver 6.5).
- **O import entra como `summary`, mas não cobre sessões:** isso evita que o texto antigo "pague" sessões novas, mas as notas antigas entram na fila de revisão. Com 15 notas grandes, a fila do dia seguinte pode pesar.

---

### Evidências desta spec

- HTML da trilha, lido em 19/11/2026 (sem alterações): ids das sections, classes `.box.seen`, `.box.new`, `.box.q`, `.box.seed`, `ul.src`, `.ex`, e o JS de export nas linhas 1039–1081.
- Scaffold real com `create-better-t-stack@3.49.2` em `/tmp` (apagado depois), `--dry-run` com `merge`, `docker manifest inspect pgvector/pgvector:pg18` e `:pg17` (ambas existem), `ssh -T git@github.com` (autenticado como `luisrca-tech`).
- Docs: <https://www.better-t-stack.dev/docs/cli/options>, <https://www.better-t-stack.dev/docs/cli/compatibility> e <https://www.better-t-stack.dev/docs/project-structure>.
- Não verificado: o atraso exato da notificação em segundo plano no Edge/Chrome do Windows, e as estimativas de tempo.

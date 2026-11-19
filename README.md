# estudos-ia

Caderno diário para aplicar o método da *Trilha de Engenharia de Sistemas com IA*: sessões cronometradas por módulo, notas com as próprias palavras, revisão espaçada (1, 3, 7 e 21 dias) e rotinas diária, semanal e mensal.

É um app de uma pessoa só, sem contas e sem IA nesta versão (V0). Publicado, ele fica atrás de uma tela de login com usuário e senha únicos (veja [Deploy](#deploy-vercel)). A especificação está em [`docs/spec-v0.md`](docs/spec-v0.md) e o design system em [`docs/design-system.md`](docs/design-system.md).

## Como rodar

Pré-requisitos: Node 24, npm 11 e **Docker aberto** (o banco roda num container; sem ele o app não carrega dados).

```bash
npm install
npm run db:start     # sobe o Postgres 18 + pgvector em localhost:5433
npm run db:migrate   # aplica as migrations versionadas
npm run db:seed      # carrega os 15 módulos e as rotinas de content/
npm run dev          # http://localhost:3001
```

A conexão fica em `apps/web/.env`, que não entra no git. Crie o arquivo com:

```
DATABASE_URL=postgresql://postgres:password@localhost:5433/estudos_ia
```

No dia a dia bastam `npm run db:start` e `npm run dev`. Se a tela mostrar "Não foi possível carregar…", o container provavelmente está parado: rode `npm run db:start` e clique em "Tentar de novo".

### Notificação e som da sessão

No primeiro clique em "Iniciar sessão", o navegador pede permissão de notificação. Ao fim do tempo, o app toca três bipes e mostra a notificação "Sessão concluída". Se a permissão for negada, só o som toca. Com a aba em segundo plano, o navegador pode atrasar o aviso em até cerca de um minuto; a duração gravada não muda, porque vem do horário de término calculado no início.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | app em `http://localhost:3001` |
| `npm run check-types` | TypeScript em todos os workspaces |
| `npm test` | testes das regras (vitest), sem banco |
| `npm run db:start` / `db:stop` / `db:down` | sobe, para ou remove o container do banco |
| `npm run db:generate` | gera uma migration a partir do schema |
| `npm run db:migrate` | aplica as migrations |
| `npm run db:seed` | sincroniza `content/` com o banco (idempotente) |
| `npm run db:studio` | Drizzle Studio |
| `npm run content:extract -- <html>` | extração única do HTML da trilha para `content/` |

Mudanças de schema usam sempre `db:generate` seguido de `db:migrate`. Os arquivos ficam em `packages/db/src/migrations/` e entram no git. Não use `db:push`.

## Estrutura

```
apps/web         Next 16 (App Router): telas e a rota /api/trpc
packages/api     routers tRPC e as regras puras em src/rules (testadas com vitest)
packages/db      schema Drizzle, migrations, seed e docker-compose do banco
packages/ui      design system: tokens e componentes
content/         módulos e rotinas em JSON; é a fonte do conteúdo
scripts/         extração única do HTML
docs/            especificação e design system
```

As datas de calendário (dia da revisão, período da rotina, "hoje") usam o fuso `America/Sao_Paulo`.

## Como adicionar um módulo (m15 em diante)

O conteúdo vive em `content/modules/*.json` e vai para a coluna `module.content` (`jsonb`), então **não há migration**.

1. Copie um arquivo de `content/modules/`, por exemplo para `content/modules/m15-novo-tema.json`.
2. Preencha `slug` (igual ao nome do arquivo, sem `.json`), `key` (`m15`), `part`, `order` (o próximo livre) e o conteúdo.
3. Rode `npm run db:seed`. Se faltar algum campo, o validador mostra o arquivo e o campo, sai com erro e não grava nada.
4. Pronto: o módulo aparece em `/modules`.

Outras operações:

- **Editar um módulo:** edite o JSON e rode o seed. O hash muda, uma versão nova do conteúdo é gravada e a página do módulo mostra o aviso "conteúdo atualizado".
- **Remover um módulo:** apague o arquivo e rode o seed. O módulo é **arquivado**, não apagado, e as notas continuam acessíveis em "Arquivados". Se o arquivo voltar, o módulo volta.
- **Rotinas:** edite `content/routines.json` e rode o seed.

`slug` e `key` não devem mudar depois do primeiro seed. Trocar o `slug` equivale a arquivar o módulo e criar outro, e as notas ficam no antigo. A `key` é o que liga o módulo ao export do HTML.

Rodar o seed sem mudanças imprime `criados 0, atualizados 0, arquivados 0`. O seed só escreve em `module`, `module_content_version` e `routine_item`; ele nunca toca em notas, sessões, revisões ou rotinas marcadas.

## Importar as anotações do HTML

Em `/import`, envie o arquivo `anotacoes-trilha-ia.md` gerado pelo botão "Exportar anotações" do HTML. Cada módulo com texto vira uma nota. As primeiras revisões entram aos poucos, no máximo 3 por dia. Importar o mesmo arquivo de novo não duplica nada. A tela também aceita um JSON copiado do `localStorage` e mostra o comando para gerá-lo.

O export contém anotações pessoais: não o coloque no repositório, que é público.

## Backup dos dados

Os dados ficam no volume Docker `estudos-ia_estudos-ia_postgres_data`. Para gerar um backup com o container `estudos-ia-postgres` de pé:

```bash
docker exec estudos-ia-postgres pg_dump -U postgres estudos_ia > backup-$(date +%F).sql
```

Para restaurar num banco vazio (por exemplo, depois de `npm run db:down` e de remover o volume):

```bash
npm run db:start
docker exec -i estudos-ia-postgres psql -U postgres estudos_ia < backup-2026-11-19.sql
```

`npm run db:down` remove o container, mas mantém o volume. Os dados só se perdem se o volume for apagado (`docker volume rm`) ou com `docker compose down -v`.

## Deploy (Vercel)

O app roda na Vercel a partir de `apps/web`, com um Postgres remoto. Não há `vercel.json`: as configurações abaixo ficam no painel do projeto.

### Configurações do projeto

| Campo | Valor |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `apps/web` |
| Include files outside the Root Directory | ligado (padrão), porque o app usa `packages/*` |
| Install Command | padrão (a Vercel detecta os workspaces do npm e instala na raiz do repositório) |
| Build Command | padrão (`next build`) |
| Output Directory | padrão (`.next`) |
| Node.js Version | 24.x |

A instalação roda o `postinstall` da raiz, que gera `apps/web/src/env.ts` e `packages/db/src/env.ts` a partir dos `.env.schema` (esses arquivos não entram no git). Esse passo não precisa de nenhum valor de variável.

### Variáveis de ambiente

Cadastre em Settings → Environment Variables, para Production (e Preview, se usar):

| Variável | Obrigatória | Para que serve |
|---|---|---|
| `DATABASE_URL` | sim, já no build | conexão com o Postgres; sem ela o `next build` falha na validação do varlock |
| `APP_PASSWORD` | sim, num deploy público | liga o login: sem sessão, as páginas vão para `/login` e `/api/trpc` responde 401; vazia, a trava fica desligada |
| `APP_SESSION_SECRET` | sim, com `APP_PASSWORD` | assina o cookie de sessão (HMAC-SHA256, 30 dias); gere com `openssl rand -hex 32`. Sem ela, ninguém consegue entrar e o servidor registra o erro |
| `APP_USER` | não | usuário do login; o padrão é `luis` |
| `_VARLOCK_ENV_KEY` | sim | chave de 64 caracteres hex; gere com `npx varlock generate-key --plain` |

Na Vercel, a integração do varlock com o Next resolve as variáveis no build e as grava criptografadas dentro do bundle, porque lá não há como resolvê-las a cada requisição. A `_VARLOCK_ENV_KEY` criptografa no build e decifra em runtime, então precisa estar disponível nos dois. Consequência: trocar `APP_PASSWORD`, `APP_SESSION_SECRET` ou `DATABASE_URL` só vale depois de um novo deploy. Trocar `APP_SESSION_SECRET` encerra todas as sessões abertas.

Use uma senha longa e aleatória. O varlock derruba qualquer resposta que contenha o valor de uma variável sensível; por isso `APP_USER` não é marcada como sensível, e uma senha curta que apareça numa nota quebraria a página.

Sem `APP_PASSWORD`, nada muda no desenvolvimento local: `npm run dev` continua sem senha.

### Banco remoto

Rode as migrations e o seed da sua máquina, apontando para o banco remoto. O valor de `DATABASE_URL` no ambiente tem precedência sobre o `apps/web/.env`:

```bash
DATABASE_URL='postgresql://usuario:senha@host:5432/banco?sslmode=require' npm run db:migrate
DATABASE_URL='postgresql://usuario:senha@host:5432/banco?sslmode=require' npm run db:seed
```

As migrations atuais não usam pgvector, então qualquer Postgres serve. A extensão `vector` só será necessária na V2 (busca nas notas); escolha um provedor que a ofereça para não precisar migrar depois.

## Fora da V0

Tutor por módulo (V1) e busca nas notas com pgvector (V2). A imagem `pgvector/pgvector:pg18` já traz a extensão `vector`, então a V2 só precisa de `CREATE EXTENSION vector` numa migration.

# Design system · estudos-ia

Decidido em 19/11/2026 com a skill `frontend-design`, antes das telas (S6/S7). Os tokens vivem em `packages/ui/src/styles/globals.css` e os componentes em `packages/ui/src/components/`. As telas só usam esses componentes e tokens.

## Direção: caderno de engenharia

O app é o caderno de uma pessoa só. Ele é aberto todo dia para três gestos: cronometrar uma sessão, escrever com as próprias palavras e tentar lembrar antes de reler. A trilha se descreve como "caderno de engenharia" e pede que cada conceito seja medido ("apliquei e medi"). A direção visual sai daí:

- **Papel frio e tinta de caneta.** Fundo cinza-esverdeado claro, como papel técnico, texto em azul-ardósia escuro e um único acento azul-cobalto, a cor da caneta. Não há gradiente nem sombra decorativa.
- **Marca-texto.** Um amarelo de marca-texto aparece só onde algo mudou ou pede atenção sem ser erro: o selo "conteúdo atualizado" e a seleção de texto.
- **A régua é o elemento memorável.** O cronômetro é uma régua graduada em minutos que vai sendo preenchida. Ele fica fixo abaixo do cabeçalho em qualquer página. É o único lugar onde o desenho chama atenção; o resto fica quieto.
- **A escada.** O degrau de domínio (0 a 5) é desenhado como cinco barras crescentes. O mesmo sinal aparece no card do módulo e no seletor de degrau.

Alternativas descartadas: creme com serifa de alto contraste e acento terracota (o padrão mais comum de página gerada), fundo quase preto com acento neon (cansa em leitura longa) e layout de jornal sem raio (frio demais para uso diário). Também descartei cards idênticos com sombra: aqui a hierarquia vem de tipografia, linha e espaço.

## Paleta

Tokens semânticos, definidos como variáveis CSS e expostos no tema do Tailwind (`bg-surface`, `text-muted-foreground`, `border-line`, `text-danger`…).

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `background` | `#F2F4F1` | `#11161B` | fundo da página |
| `surface` | `#FBFCFB` | `#192027` | cards, campos, cabeçalho |
| `surface-sunken` | `#E9ECE8` | `#0C1014` | áreas rebaixadas: trilho da régua, código, esqueleto |
| `foreground` (texto) | `#17212B` | `#E3E8E5` | texto principal |
| `muted-foreground` | `#57626C` | `#98A3AB` | texto secundário, metadados |
| `line` | `#D3D9D4` | `#2A343D` | divisórias e bordas de superfície |
| `line-strong` | `#AEB7B1` | `#44505A` | bordas de controles, marcas da régua |
| `accent` | `#2A47C2` | `#93A8FF` | ação principal, links, progresso |
| `accent-foreground` | `#FFFFFF` | `#0E1630` | texto sobre o acento |
| `accent-soft` | `#E3E8FA` | `#1F2A52` | fundo de seleção, trecho já percorrido da régua |
| `success` / `success-soft` | `#1C7548` / `#DDEFE4` | `#62CB93` / `#163626` | em dia, coberto, concluído |
| `warning` / `warning-soft` | `#8F5600` / `#F6E9CF` | `#E8B657` / `#3A2C10` | pendente com prazo ("faltam Xh") |
| `danger` / `danger-soft` | `#B4271F` / `#F8E0DD` | `#FF8F85` / `#45191A` | atrasado, erro, apagar |
| `focus` | `#2A47C2` | `#B9C6FF` | contorno de foco |
| `highlight` / `highlight-ink` | `#FFE35A` / `#3D3200` | `#E8CC45` / `#2B2400` | marca-texto: conteúdo atualizado, seleção |

Semântica dos estados, sempre com texto e ícone além da cor:

- **ok** (`success`): rotina completa, sessão com resumo, "Tudo em dia".
- **pendente** (`warning`): resumo dentro das 24 h, revisões de hoje.
- **alerta** (`danger`): resumo atrasado, revisões atrasadas, erro de carregamento.

O texto principal e o secundário passam de 4,5:1 sobre `background` e `surface` nos dois temas. O tema segue o sistema e pode ser trocado no cabeçalho.

## Tipografia

| Papel | Família | Onde |
|---|---|---|
| Leitura e títulos | **Literata** (serifada, feita para leitura longa) | conteúdo dos módulos, notas, perguntas de revisão, títulos de página |
| Interface | **IBM Plex Sans** | navegação, botões, rótulos, metadados |
| Escrita e medida | **IBM Plex Mono** | textarea do editor e os dígitos do cronômetro |

Escala (razão próxima de 1,2), em px: 12 · 14 · 15 (base da interface) · 17 (prosa) · 20 · 24 · 30 · 38.

- Prosa: 17 px, entrelinha 1,7, coluna de no máximo 68 caracteres, alinhada à esquerda.
- Interface: 15 px, entrelinha 1,5. Metadados em 14 px ou 12 px.
- Títulos: Literata em peso 600, entrelinha 1,2, `text-wrap: balance`.
- Rótulos em caixa normal, sem versalete e sem espaçamento de letras. Os dígitos do cronômetro usam algarismos tabulares.

## Espaço e raio

- Espaço: múltiplos de 4 px. Passos usados: 4, 8, 12, 16, 24, 32, 48, 64. Entre seções de página, 48; dentro de um card, 16 ou 24.
- Raio por função, não um só para tudo: 4 px em controles (botão, campo, caixa), 8 px em superfícies (card, alerta), 12 px na barra do cronômetro, total em selos e nos marcadores.
- Largura: 720 px na coluna de leitura (módulo, nota, revisão) e 1040 px nas páginas de lista e no painel Hoje.
- Sombra só em elementos flutuantes (menu, toast). Cards são planos, com linha de 1 px.

## Foco e movimento

- Foco de teclado: contorno de 2 px em `focus` com 2 px de afastamento em todo elemento interativo, sem exceção.
- Movimento só responde a uma ação (marcar, revelar, trocar de aba) ou mostra o tempo passando na régua. Com `prefers-reduced-motion`, as transições são desligadas.

## Componentes e estados

| Componente | Arquivo | Variantes e estados |
|---|---|---|
| Botão | `button.tsx` | `primary` (uma por tela), `secondary`, `outline`, `ghost`, `danger`, `link`; tamanhos `sm`, `md`, `lg`, `icon`; estados hover, pressionado, foco, desabilitado e carregando (`aria-busy`) |
| Card | `card.tsx` | padrão (superfície com linha), `interactive` (link inteiro, borda de acento no hover e no foco), `sunken` |
| Selo | `badge.tsx` | `neutral`, `accent`, `success`, `warning`, `danger`, `highlight` |
| Alerta | `alert.tsx` | `info`, `success`, `warning`, `danger`; ícone, título, texto e ações; `danger` usa `role="alert"` |
| Item de checklist | `checklist-item.tsx` | desmarcado, marcado (texto riscado e apagado), desabilitado, com dica |
| Barra do cronômetro | `timer-bar.tsx` | correndo, último minuto (tom de aviso), concluindo; régua com marcas por minuto |
| Abas | `tabs.tsx` | aba ativa com traço de acento; navegação por setas |
| Editor de nota | `markdown-editor.tsx` | abas Escrever e Pré-visualizar; textarea monoespaçada; inválido; contador de caracteres |
| Card de revisão | `review-card.tsx` | pergunta oculta → revelada; ações só depois de revelar |
| Escada de domínio | `step-ladder.tsx` | sinal de 5 barras (somente leitura) e seletor de degrau 0–5 |
| Controle segmentado | `segmented.tsx` | seleção única (tipo de nota, minutos, filtro) |
| Campo | `field.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `label.tsx` | rótulo, dica, erro (`aria-invalid`), desabilitado |
| Estado vazio | `empty-state.tsx` | título, uma frase que diz o que fazer e uma ação opcional |
| Carregando | `skeleton.tsx` | blocos e linhas com o formato do conteúdo final |
| Erro | `error-state.tsx` | o que falhou, como resolver e "Tentar de novo" |
| Página | `page.tsx` | `PageShell` (largura `reading` ou `wide`), `PageHeader`, `Section` |
| Prosa | `prose.tsx` | estilos de Markdown para conteúdo e notas |

## Texto da interface

Frases curtas em caixa normal, na voz do próprio caderno. O botão diz o que acontece ("Iniciar sessão de 25 min", "Escrever resumo", "Revelar"). O erro diz o que falhou e o que fazer. O estado vazio convida a agir.

## Escuta

- **Serifa na leitura, sem serifa na interface.** Custa carregar três famílias, mas separa "ler e pensar" de "operar o app", que é a distinção que o método pede.
- **Um só acento.** Estados usam verde, âmbar e vermelho; o azul fica reservado para ação e progresso. Isso mantém o alerta atrasado como a coisa mais forte da tela Hoje.
- **Componentes do scaffold removidos.** `attachment`, `bubble`, `marker`, `message`, `message-scroller`, `input-group`, `tooltip` e `empty` vinham do template (interface de chat) e não tinham uso na V0.

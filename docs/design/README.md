# Design · Degrau

Screen and interaction design for V0, made on 2026-11-19. Interactive canvas: https://claude.ai/artifact/DH7gsC9q6S7EUTxLGSu66f (private; open it from the owner's account).

- `tokens.json` — colors (light and dark), type, spacing, radii, layout widths, shadows and motion. The values match `packages/ui/src/styles/globals.css`, which stays the source of truth for code.
- `screens/` — the canvas sources (`*.dc.html`) and their layout index (`canvas.json`). They use the canvas runtime (`support.js`), so they render on the canvas, not as standalone pages. Read them as the exact spec for markup, copy and states.

The visual language (palette, Literata / IBM Plex, radii) comes from `docs/design-system.md`. **The screen structure and interaction model below replace the layouts in that document and in `docs/spec-v0.md` §UI where they differ.**

## Principles

The app is opened every day by one person to run one method. Every screen answers "what do I do next?" before anything else.

1. **The method sets the order.** Today is a numbered queue, not a dashboard: debt first (overdue summaries), then remembering (reviews), then writing (pending summary), then the daily routine. Only the next step is expanded.
2. **The session leads into the summary.** The timer is a dock at the bottom of every page. When time runs out it offers "Escrever resumo agora", which opens the editor with the session linked and the source closed.
3. **Remember before you see.** Reviews ask for an answer before revealing the note, then show your answer next to your note.
4. **Course content is separate from my notebook.** The module page shows the trail's content on the left and "Meu caderno" (degrau, notes, sessions) on the right.
5. **Keyboard first.** A single user who is a developer: every frequent action has a key.

## Layout

- Header (56 px): wordmark, Hoje · Módulos · Revisões (with the count due) · Rotinas · Sessões · Importar, a "Ir para… ⌘K" command button and the theme toggle. The active item gets a 2 px underline in `foreground`, not in accent, so accent stays reserved for actions.
- Session dock: sticky at the bottom of every page while a session runs. Its top edge is the ruler (one tick per minute, a taller one every 5). States: running, last minute (warning color, "feche a fonte"), finished ("Escrever resumo agora" / "Concluir, resumo depois").
- Widths: 1120 px page, 680 px reading column, 720 px focus pages (review, import). Everything wraps to one column under ~900 px.

## Screens

| Screen | Board | What changed and why |
|---|---|---|
| Hoje | `Hoje`, `Hoje-vazio` | Numbered queue. Side panel holds the 25-minute session (module picker with a reason for the suggestion, shortcut S) and the open weekly/monthly items. Empty state: "Tudo em dia." with the session panel still available. |
| Módulos | `Modulos` | "Mapa da trilha": one row per module with the degrau as 5 cells (accent up to 2, green from 3 = the goal), note count and last session. The header shows progress toward the goal. Rows scan faster than cards when choosing what to study. |
| Módulo | `Modulo` | Reading column: decision questions, what's new (changed passages highlighted until "Ok, li"), readings with type, duration and grade, exercise, seed. Side panel "Meu caderno": a staircase with the current step, the next step's requirement and the action to reach it, notes (N) and sessions. |
| Editor de nota | `Editor`, `Editor-previa` | Markdown and preview side by side. A row of chips tracks which sections of the note template are written (concept note for summaries, ADR for decisions). Session summaries show "Fonte fechada". Review question and grade live in a "Para revisar depois" block. ⌘S saves; drafts autosave. |
| Revisões | `Revisoes`, `Revisoes-revelada` | One question at a time, segmented progress ("3 de 8"). Optional answer field before revealing (Space). After revealing: your answer next to your note, then "Não lembrei (1) · volta amanhã" and "Lembrei (2) · próxima em N dias". |
| Rotinas | `Rotinas` | Three columns (daily, weekly, monthly) with the period and time left, the checklist with duration hints, and a compact history of past periods as 3 squares each. |
| Sessões | `Sessoes` | Table grouped by day: start, module, focus time with a small bar, summary status and the action. Filter "Sem resumo" with count. |
| Importar | `Importar`, `-previa`, `-resultado` | Three steps (Arquivo, Prévia, Resultado). The preview says what happens to each section (create, already imported, empty) before anything is written. |

Every screen has a light and a dark board (`*-escuro`).

## Components

Boards `Componentes` / `Componentes-escuro`, `Cabecalho`, `Timer`.

- **Queue step** — states: next (filled marker, expanded), pending, done (collapses and moves down), overdue (danger marker and badge, moves up).
- **Session dock** — running, last minute, finished.
- **Map row** — current-session highlight, goal reached, not started.
- **Staircase** — done steps in `accent-soft`, current filled, next dashed.
- **Button** — primary (one per screen), outline, ghost, danger (outlined), link; default, hover, pressed, focus, disabled, loading.
- **Template guide chips**, **segmented control**, **step indicator**, **fields** (default, focus, error, disabled, title), **checklist with period history**, **badges and highlight**, **empty, error, loading and toast with undo**.

## Shortcuts

| Key | Action |
|---|---|
| ⌘K | Go to a module, note or action |
| S | Start a 25-minute session |
| R | Start reviews |
| N | New note (on a module) |
| Space | Reveal the note (review) |
| 1 / 2 | Didn't remember / Remembered |
| ⌘S | Save note |

## Listening

- **Kept the tokens, replaced the screens.** The palette and type already pass contrast in both themes and match the implemented `packages/ui`. The change is in structure and flow, so the code can adopt it screen by screen.
- **Timer moved from a bar under the header to a bottom dock.** It keeps the reading area clean and puts Concluir where the hand already is at the end of a session. Rejected: a header pill (too small to carry the summary prompt) and a full-screen focus mode (hides the module content the session is about).
- **Queue instead of dashboard.** Rejected: summary cards per area, because they leave the order of the method implicit.
- **Matrix instead of module cards.** Rejected: cards with level and count; 15 cards need two scrolls to compare.
- **Danger buttons are outlined.** A filled red button competed with the overdue badge for attention.
- **Not verified in a browser.** The boards were not screenshotted at desktop and phone widths in this pass; review them on the canvas before implementing.

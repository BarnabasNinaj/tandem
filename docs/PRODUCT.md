# Product & UX

## Positioning

Private household operating system for a couple — calm, local-first, not a bank or fintech SaaS. Copy should never imply “create an account” or “cloud subscription.” Sync language: **private vault / GitHub**, not “our servers.”

## Surfaces

| Surface | Purpose |
|---------|---------|
| Setup | Join via invite link/QR + pairing code, or manual GitHub + PAT (token step must pass repo connection before password); password step is **unlock** if vault exists, **create** only if repo has no vault yet |
| Lock | Unlock with master password (no vault path shown) |
| Home | Logo-only (`/`): **Overview** — same sticky `PageHeader` band as other app pages; horizontal snap scroller of all tracked months (asc), optional untracked calendar card, ending with next-month **estimate**. Opens centered on current. Thumb-drag / swipe + chevrons. Each tracked card shows partner **Pays** (fair share of bills) + **Keeps**, plus a settle line when card payments were recorded. Not in the main nav. Empty vault → track CTA / load samples. Active editor draft → continue banner. |
| Track | Hub (`/track`): sticky `PageHeader` + calendar-month CTA + tracked-month list (+ resume unsaved draft). List rows are one line: month · In/Out · pencil edit · delete (confirm + sync). Editor: same header band (back · month title · month select) + inline form (Incomes · **Expenses** card-first · optional **Notes**). Sticky footer: **Household** (expenses · left) · **partner A** · **partner B** (**Pays** = fair share of bills, not card charge; **Keeps**); settle line when `paymentByOwner` has data (who transfers how much). Action row = split + **Cancel** / **Save month** (Save also flushes any unapplied card-sheet amounts). Editor bottom padding clears the sticky footer so **Add to month** stays clickable. No modal wizard. |
| History | Charts over tracked months: category lines, income vs expense (solid actuals · sage/sand dashed projections), expense mix (`PieBreakdown`: donut left, €/% rows fill the remaining width — two columns when ≥5 slices; same component as Expenses). Sticky range: 3M / 6M / 1Y / All. Click a legend item (or mix row) to hide/show that series. |
| Incomes | Incomes only: compact metric strip + stacked bars + share pie (`PieBreakdown`) + month table (partner A / partner B / Other). Same sticky range. Legend / list click filters series. **Edit** → Track editor for that month. |
| Expenses | Expenses only: compact metric strip + stacked category bars + expense mix (`PieBreakdown`, same as History) + category × month table (category rows, month columns; Edit under each month). Same sticky range. Legend / list click filters series. |
| Outlook | Hero “Left over” (Σ pocket) + month-by-month leftover bars; looking-ahead columns (Income; Expenses €/%; Pocket €/%) from trailing averages; category baselines. Same sticky range. Cashflow leftover ≠ bank cash. No multi-month projection table (flat averages would repeat the same row). |
| Settings | Sticky tabs: **Household** (names + expense/pocket split) · **Categories** · **Banks** (read-only until pencil: then rename/delete bank & cards, remap/add/delete labels) · **Vault** (GitHub data repo, invite QR) · **Security** (auto-lock + password) · **Data** (samples, JSON backup). Brief plain-English notes on each tab and on Track / Overview / analytics headers. |

Nav: **Track**, **History**, **Incomes**, **Expenses**, **Outlook** (text); **Settings** as a header icon (with sync / theme / lock). **Tandem** logo mark opens **Overview** Home (`/`) — not listed in the tab bar. Track lives at `/track`. Legacy `/trends` & `/breakdown` → History; `/analytics` → Outlook. Brand mark: **Tandem** (`Fugaz One`, teal). Loop: **overview** → **track** → **review** (History / Incomes / Expenses) → **look ahead** (Outlook).

UI copy never uses formula letters **X / Y / Z** — say income, expenses, left after expenses, pocket. Those letters stay in `finance.ts` / docs only.

## Visual system (`src/index.css`)

| Token | Light | Role |
|-------|-------|------|
| `--logo` | `#0f766e` | Brand / accents |
| `--partner-a` | `#0369a1` | Partner A (Barney) — blue |
| `--partner-b` | `#be123c` | Partner B (Lucka) — rose (not brand teal/green) |
| `--partner-common` | `#7c3aed` | Household / common card — violet |
| `--partner-other` | `#854d0e` | Other income — amber (AA on light surfaces) |
| `--bg` | `#eef1ef` | Page ground |
| `--surface` | `#ffffff` | Panels |
| Fonts | Plus Jakarta Sans + Fugaz One | Body / logo |

Partner hexes also live in `src/lib/partners.ts` (`PARTNER_COLOR`) for charts. Dark theme brightens the CSS vars.

Dark theme via `.dark` on root (inline boot script in `index.html` + hook `use-theme`). Tailwind `dark:` utilities are **class-based** (`@custom-variant dark` in `src/index.css`) so the in-app toggle is not fighting `prefers-color-scheme`. Setup/lock share `AuthShell` + `public/auth-shell.css` (same classes as the pre-React static lock shell — avoids layout jump on refresh). Boot: locked vault paints that full unlock shell into `#root`; React replaces it in place. Focus uses `preventScroll`. Quiet session restore stays blank until `ready`. Fonts self-hosted (`public/fonts/`, Fugaz + Jakarta preloaded).

Muted UI copy uses `text-stone-600 dark:text-stone-400` (not bare `stone-500`/`stone-400`) so labels and table headers clear WCAG AA on both canvases. Chart axis ticks / legend labels use `--text-faint` / `--text-muted` via `chart-theme.ts` so pastel series fills are not used as text color. Chart tooltips use `tipProps` + `.recharts-default-tooltip` CSS so dark mode isn’t stuck on Recharts’ light defaults. Legend clicks filter series (`use-legend-filter.ts`); hidden labels are dimmed with strikethrough.

**Type hierarchy** (keep these distinct — do not reuse tiny uppercase for section titles):

| Tier | Component / pattern | Look |
|------|---------------------|------|
| Page | `PageHeader` | Large sentence-case title + muted subtitle |
| Section | `SectionHeading` (free-standing) or `CardTitle` (in cards) | Sentence case, display font, `text-base`/`sm:text-lg` semibold |
| Meta | `MetaLabel`, table `<th>`, form `Label` | Tiny uppercase tracking — metrics, columns, field chrome only |

Outlook “In this range” / “Looking ahead” / “Category baselines”, Track hub sections, and MonthEditor Incomes / Expenses / Notes use `SectionHeading`. Income · Expenses · Pocket inside Looking ahead stay `MetaLabel`.

Motion: `fadeUp` on in-app surfaces (Track, analytics); auth gate mounts without entrance animation. Prefer subtle transitions over noisy animations. Layout: no page-level horizontal scroll — avoid negative-margin full-bleed; shell / `html` clip `overflow-x`; Overview month scroller uses `min-w-0`. Do not set `scrollbar-gutter: stable` on `html` — it leaves a dead right strip on short pages when the scrollbar is absent.

UI primitives: `src/components/ui/*` (button, input, select, card, label, money-input, progress). Native `<select>` goes through `Select` (custom inset chevron, not the browser-flush arrow). Clickable controls use `cursor-pointer` (hand) on hover, not the default arrow.

## Shortcuts (ready phase)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | Start tracking current month and open Track (draft from last record) |
| `Ctrl/Cmd + S` | If Track editor active → save month; else → push vault |

## Dates & money

- Display dates: **DD/MM/YYYY** (**Last Synced** `DD/MM/YYYY HH:mm` on the pull-icon tooltip, not in the header)
- Header icon tooltips: Settings, sync/pull (Last Synced; notes unsaved local edits), theme (Switch to light/dark), lock (Lock)
- Settings **Save & sync** on Household / Categories / Banks / Security (auto-lock); header sync pushes dirty local edits before pull
- Month labels: **MM/YYYY** from `YYYY-MM` keys
- Money: always **euro** (`formatMoney` → `€` + `sk-SK` grouping); inputs via `MoneyInput` / `parseLocaleNumber` (`,` and `.`)

## Auto-lock

Idle timer from `settings.autoLockMinutes` (default 30), edited under **Settings → Security**. Events: mousemove, keydown, touchstart, click, scroll. Calls `lock()` → clears session secrets + draft.

## Partner onboarding story

1. Partner A creates private data repo + PAT, completes manual setup, sets password.
2. Partner A opens Settings → Add a device → Show invite QR (shows QR + pairing code; treat the link as sensitive).
3. Partner B scans with the phone camera (opens Tandem) or uses in-app Scan / paste link → enters the **pairing code** from A’s screen → then the **same** master password.
4. Manual GitHub + PAT also works: setup detects an existing vault and asks to unlock, not create a new password.
5. Both edit months; pull when needed; resolve conflicts consciously.

## Empty / demo states

New vaults start with empty history. Track hub offers loading samples when empty or **Track month**; Settings can **load** or **delete** synthetic H1 2026 (`2026-01`–`2026-06`). See [DATA-MODEL.md](./DATA-MODEL.md).

# Product & UX

## Positioning

Private household operating system for a couple — calm, local-first, not a bank or fintech SaaS. Copy should never imply “create an account” or “cloud subscription.” Sync language: **private vault / GitHub**, not “our servers.”

## Surfaces

| Surface | Purpose |
|---------|---------|
| Setup | Join via invite link/QR + pairing code → vault probe → password (never shows GitHub username/repo fields), or manual GitHub + PAT (token step must pass repo connection before password); password step is **unlock** if vault exists, **create** only if repo has no vault yet |
| Lock | Unlock with master password (no vault path shown) |
| Home | `/` — same sticky `PageHeader` band as other app pages; horizontal snap scroller of all tracked months (asc), optional untracked calendar card, ending with next-month **estimate**. Opens centered on current. Thumb-drag follows the strip (snap off while dragging), then smooth-settles like the chevrons / Earlier·Later controls. Card titles use full month names (`October 2026` via `formatMonthName`, same as Track list) — slightly smaller and muted vs the net figure so they don’t compete. Status meta (**Estimate** / **Not tracked**) sits on the same line as the month title so cards stay vertically aligned; no “Tracked” or “Current” — calendar month name is teal. Each tracked card shows **Net** (caption **left after expenses** / **short this month**; orange when negative) + partner **Income** + **Pays** + **Keeps** (Keeps also orange when negative), plus a settle line when card payments were recorded. In main nav (first tab) and via **Tandem** logo. Empty vault → track CTA / load samples. Active editor draft → continue banner. |
| Track | Hub (`/track`): sticky `PageHeader` + calendar-month CTA + tracked-month list (+ resume unsaved draft). Tracked-months list is read-only until the section pencil (same pattern as Settings → Banks); then per-row open + delete (confirm + sync), check to finish. List rows: month · left-aligned In/Out/**Net** (label over amount; negative Net in Outlook orange). On narrow screens the metrics sit on a second row under month (+ actions while editing); `sm+` stays one row. List titles and the “This calendar month” hero use full month names (`October 2026` via `formatMonthName`); compact `MM/YYYY` stays in selects/aria elsewhere. Calendar month is teal in the list (no “current” label). Editor: same header band (back · month title · month select) + inline form (Incomes · **Expenses** card-first · optional **Notes**). Sticky footer: **Household** (expenses · Net / left after expenses or short this month) · **partner A** · **partner B** (**Pays** = fair share of bills, not card charge; **Keeps**); settle line when `paymentByOwner` has data (who transfers how much). Action row = split + **Cancel** / **Save month** (Save also flushes any unapplied card-sheet amounts). Editor bottom padding clears the sticky footer so **Add to month** stays clickable. No modal wizard. |
| History | Charts over tracked months: income vs expense (solid actuals · sage/sand dashed projections), **Net** bars (teal / orange when short; caption = cumulative Net + left after expenses / short), **Keeps** lines per partner (fair share of Net), category lines, expense mix (`PieBreakdown`: donut left, €/% rows fill the remaining width — two columns when ≥5 slices; same component as Expenses). Helpers: `netOverTime`, `keepsOverTime`. Sticky range: 3M / 6M / 1Y / All. Click a legend item (or mix row) to hide/show that series. |
| Incomes | Incomes only: shared `RangeHero` (“In this range” shell; same Avg / mo · partners · Other metrics as before, compact wrap) + stacked bars + share pie (`PieBreakdown`) + month table (partner A / partner B / Other). Same sticky range. First **Month** column stays visible while scrolling the table horizontally (`.analytics-sticky-label`). Legend / list click filters series. **Edit** → Track editor for that month. |
| Expenses | Expenses only: shared `RangeHero` (“In this range” shell; same Avg / mo · range total · largest category metrics, compact wrap) + stacked category bars + expense mix (`PieBreakdown`, same as History) + category × month table (category rows, month columns; Edit under each month). Same sticky range. First **Category** column stays visible on horizontal scroll (`.analytics-sticky-label`). Legend / list click filters series. |
| Outlook | Shared `RangeHero` **Net** (Σ income − expenses) + month-by-month net bars; caption uses left after expenses / short (range or this month); looking-ahead columns (Income; Expenses €/%; **Net** €/%) from trailing averages; category baselines (first **Category** column sticky on horizontal scroll). Same sticky range. Cashflow net ≠ bank cash. No multi-month projection table (flat averages would repeat the same row). |
| Settings | Sticky tabs: **Household** (names + expense/pocket split) · **Categories** · **Banks** (read-only until pencil: then rename/delete bank & cards, remap/add/delete labels) · **Vault** (GitHub data repo, invite QR) · **Security** (auto-lock + password) · **Data** (samples, JSON backup). Brief plain-English notes on each tab and on Track / Home / analytics headers. |

Nav: **Home**, **Track**, **History**, **Incomes**, **Expenses**, **Outlook** (text); **Settings** as a header icon (with sync / theme / lock). **Tandem** logo mark also opens Home (`/`). Track lives at `/track`. Legacy `/trends` & `/breakdown` → History; `/analytics` → Outlook. Brand mark: **Tandem** (`Fugaz One`, teal). Loop: **home** → **track** → **review** (History / Incomes / Expenses) → **look ahead** (Outlook).

UI copy never uses formula letters **X / Y / Z** — say income, expenses, **Net**, left after expenses / short this month (sign-aware). Settings may still say “pocket” for the split of leftover. Those letters stay in `finance.ts` / docs only.

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

Outlook / Incomes / Expenses “In this range” (`RangeHero`), Outlook “Looking ahead” / “Category baselines”, Track hub sections, and MonthEditor Incomes / Expenses / Notes use `SectionHeading`. Income · Expenses · Net inside Looking ahead stay `MetaLabel`.

Motion: every ready-phase page uses `PageShell` (body `z-0`; no `isolate`). Sticky `PageHeader` / Settings must stay free of `transform`, opacity entrance animation, and box-shadow layer promotion — those GPU layers make subtitle text blur and reflow on every mobile scroll. Seam seal is a plain absolute fill; app header keeps a surface strip. Subtitle type locked `14px/20px`. `overflow-x: clip` only on `html` (not body/#root/AppShell). App header, mobile bottom nav, and Track editor footer stay opaque. Auth gate mounts without entrance animation. Home month scroller uses `min-w-0`. Root scrollbar is overlay-hidden (`scrollbar-width: none` + `::-webkit-scrollbar` in `index.css` / boot `index.html`) so classic bars never reserve width — no Home↔tall-page jump and no `scrollbar-gutter` stripe. Wheel / touch / keyboard still scroll; nested overflow regions keep their own bars. Do not use `scrollbar-gutter: stable` on `html`.

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
- Month labels: **MM/YYYY** from `YYYY-MM` keys (compact); Home cards + Track hub list titles use **MMMM YYYY** (`formatMonthName`)
- Money: always **euro** (`formatMoney` → `€` + `sk-SK` grouping); inputs via `MoneyInput` / `parseLocaleNumber` (`,` and `.`)

## Auto-lock

Idle timer from `settings.autoLockMinutes` (default 30), edited under **Settings → Security**. Events: mousemove, keydown, touchstart, click, scroll. Calls `lock()` → clears session secrets + draft.

## Partner onboarding story

1. Partner A creates private data repo + PAT, completes manual setup, sets password.
2. Partner A opens Settings → Add a device → Show invite QR (shows QR + pairing code; treat the link as sensitive).
3. Partner B scans with the phone camera (opens Tandem) or uses in-app Scan / paste link → enters the **pairing code** from A’s screen → brief vault check (no GitHub username/repo form) → then the **same** master password.
4. Manual GitHub + PAT also works: setup detects an existing vault and asks to unlock, not create a new password.
5. Both edit months; pull when needed; resolve conflicts consciously.

## Empty / demo states

New vaults start with empty history. Track hub offers loading samples when empty or **Track month**; Settings can **load** or **delete** synthetic full-year 2026 (`2026-01`–`2026-12`) with wide income/expense swings (including deficit months). See [DATA-MODEL.md](./DATA-MODEL.md).

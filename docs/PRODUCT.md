# Product & UX

## Positioning

Private household operating system for a couple — calm, local-first, not a bank or fintech SaaS. Copy should never imply “create an account” or “cloud subscription.” Sync language: **private vault / GitHub**, not “our servers.”

## Surfaces

| Surface | Purpose |
|---------|---------|
| Setup | Join via invite QR **or** manual GitHub + PAT + password |
| Lock | Unlock with master password (no vault path shown) |
| Track | Hub: calendar-month CTA + tracked-month list (+ resume unsaved draft). Editor: inline month form (Incomes · **Expenses** card-first · optional **Notes**). Sticky footer: **Household** (expenses · left) · **partner A** · **partner B**; action row = split + **Cancel** / **Save month** (Save also flushes any unapplied card-sheet amounts). Editor bottom padding clears the sticky footer so **Add to month** stays clickable. No modal wizard. |
| History | Charts over tracked months: category lines, income vs expense (solid actuals · sage/sand dashed projections), expense mix pie. Sticky range: 3M / 6M / 1Y / All. |
| Incomes | Incomes only: compact metric strip + stacked bars + share pie + month table (partner A / partner B / Other). Same sticky range. **Edit** → Track editor for that month. |
| Expenses | Expenses only: compact metric strip + stacked category bars + mix pie + month × category table. Same sticky range. **Edit** → Track editor for that month. |
| Outlook | Forward look: compact metric strip + trailing averages → next 3 months; category baselines (avg / last / €/mo slope). Same sticky range. |
| Settings | Sticky tabs: **Household** · **Categories** · **Banks** (read-only until pencil: then rename/delete bank & cards, remap/add/delete labels) · **Vault** (GitHub data repo, invite QR) · **Security** (password) · **Data** (samples, JSON backup) |

Nav: **Track**, **History**, **Incomes**, **Expenses**, **Outlook** (text); **Settings** as a header icon (with sync / theme / lock). **Tandem** logo mark links to Track (`/`). Legacy `/trends` & `/breakdown` → History; `/analytics` → Outlook. Brand mark: **Tandem** (`Fugaz One`, teal). Loop: **track** → **review** (History / Incomes / Expenses) → **look ahead** (Outlook).

UI copy never uses formula letters **X / Y / Z** — say income, expenses, left after expenses, pocket. Those letters stay in `finance.ts` / docs only.

## Visual system (`src/index.css`)

| Token | Light | Role |
|-------|-------|------|
| `--logo` | `#0f766e` | Brand / accents |
| `--partner-a` | `#0369a1` | Partner A (Barney) — blue |
| `--partner-b` | `#be123c` | Partner B (Lucka) — rose (not brand teal/green) |
| `--partner-common` | `#7c3aed` | Household / common card — violet |
| `--partner-other` | `#ca8a04` | Other income — amber |
| `--bg` | `#eef1ef` | Page ground |
| `--surface` | `#ffffff` | Panels |
| Fonts | Plus Jakarta Sans + Fugaz One | Body / logo |

Partner hexes also live in `src/lib/partners.ts` (`PARTNER_COLOR`) for charts. Dark theme brightens the CSS vars.

Dark theme via `.dark` on root (inline boot script in `index.html` + hook `use-theme`). Setup/lock share `AuthShell` + `public/auth-shell.css` (same classes as the pre-React static lock shell — avoids layout jump on refresh). Boot: locked vault paints that full unlock shell into `#root`; React replaces it in place. Focus uses `preventScroll`. Quiet session restore stays blank until `ready`. Fonts self-hosted (`public/fonts/`, Fugaz + Jakarta preloaded).

Motion: `fadeUp` on in-app surfaces (Track, analytics); auth gate mounts without entrance animation. Prefer subtle transitions over noisy animations.

UI primitives: `src/components/ui/*` (button, input, select, card, label, money-input, progress). Native `<select>` goes through `Select` (custom inset chevron, not the browser-flush arrow). Clickable controls use `cursor-pointer` (hand) on hover, not the default arrow.

## Shortcuts (ready phase)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | Start tracking current month on Track (draft from last record) |
| `Ctrl/Cmd + S` | If Track editor active → save month; else → push vault |

## Dates & money

- Display dates: **DD/MM/YYYY** (**Last Synced** `DD/MM/YYYY HH:mm` on the pull-icon tooltip, not in the header)
- Header icon tooltips: Settings, sync/pull (Last Synced; notes unsaved local edits), theme (Switch to light/dark), lock (Lock)
- Settings **Save & sync** on Household / Categories / Banks; header sync pushes dirty local edits before pull
- Month labels: **MM/YYYY** from `YYYY-MM` keys
- Money: always **euro** (`formatMoney` → `€` + `sk-SK` grouping); inputs via `MoneyInput` / `parseLocaleNumber` (`,` and `.`)

## Auto-lock

Idle timer from `settings.autoLockMinutes` (default 30). Events: mousemove, keydown, touchstart, click, scroll. Calls `lock()` → clears session secrets + draft.

## Partner onboarding story

1. Partner A creates private data repo + PAT, completes manual setup, sets password.
2. Partner A opens Settings → Add a device → Show invite QR.
3. Partner B scans on setup, enters **same** master password, unlocks existing vault.
4. Both edit months; pull when needed; resolve conflicts consciously.

## Empty / demo states

New vaults start with empty history. Track hub offers loading samples when empty or **Track month**; Settings can **load** or **delete** synthetic H1 2026 (`2026-01`–`2026-06`). See [DATA-MODEL.md](./DATA-MODEL.md).

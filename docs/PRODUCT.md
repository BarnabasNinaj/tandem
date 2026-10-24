# Product & UX

## Positioning

Private household operating system for a couple — calm, local-first, not a bank or fintech SaaS. Copy should never imply “create an account” or “cloud subscription.” Sync language: **private vault / GitHub**, not “our servers.”

## Surfaces

| Surface | Purpose |
|---------|---------|
| Setup | Join via invite QR **or** manual GitHub + PAT + password |
| Lock | Unlock with master password (no vault path shown) |
| Home | Hero: net worth | **Last updated** | **Track Data**; then pocket split, flow, reserves |
| History | Charts over tracked months: category lines, income vs expense (solid actuals · sage/sand dashed projections), net worth (+ dashed path), expense mix pie. Sticky range: 3M / 6M / 1Y / All. |
| Incomes | Incomes only: compact metric strip + stacked bars + share pie + month table (partner A / partner B / Other). Same sticky range. |
| Expenses | Expenses only: compact metric strip + stacked category bars + mix pie + month × category table. Same sticky range. |
| Outlook | Forward look: compact metric strip + trailing averages → next 3 months; category baselines (avg / last / €/mo slope). Same sticky range. |
| Settings | Sticky tabs: **Household** · **Categories** · **Cards** (Common / Barney / Lucka + label mappings) · **Sync** (GitHub, invite QR) · **Security** (password) · **Data** (samples, JSON backup) |
| Track Data wizard | Month picker loads **saved** months for edit (or seeds a new one); Incomes → Expenses → Allocations; **Add from card**; **Edit** on Incomes/Expenses tables opens that month |

Nav: **Home**, **History**, **Incomes**, **Expenses**, **Outlook** (text); **Settings** as a header icon (with sync / theme / lock). **Tandem** logo mark links to Home. Legacy `/trends` & `/breakdown` → History; `/analytics` → Outlook. Brand mark: **Tandem** (`Fugaz One`, teal).

UI copy never uses formula letters **X / Y / Z** — say income, expenses, left after expenses, pocket. Those letters stay in `finance.ts` / docs only.

## Visual system (`src/index.css`)

| Token | Light | Role |
|-------|-------|------|
| `--logo` | `#0f766e` | Brand / accents |
| `--bg` | `#eef1ef` | Page ground |
| `--surface` | `#ffffff` | Panels |
| Fonts | Plus Jakarta Sans + Fugaz One | Body / logo |

Dark theme via `.dark` on root (hook `use-theme`). Setup/lock use light canvas + `.logo-mark-on-light`.

Motion: `fadeUp` keyframes; Home hero reveal. Prefer subtle transitions over noisy animations.

UI primitives: `src/components/ui/*` (button, input, select, card, label, money-input, progress). Native `<select>` goes through `Select` (custom inset chevron, not the browser-flush arrow). Clickable controls use `cursor-pointer` (hand) on hover, not the default arrow.

## Shortcuts (ready phase)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | Open Track Data wizard (draft from current month + last record) |
| `Ctrl/Cmd + S` | If wizard open with draft → save month; else → push vault |

## Dates & money

- Display dates: **DD/MM/YYYY** (**Last Synced** `DD/MM/YYYY HH:mm` on the pull-icon tooltip, not in the header)
- Header icon tooltips: Settings, sync/pull (Last Synced; notes unsaved local edits), theme (Switch to light/dark), lock (Lock)
- Settings **Save & sync** on Household / Categories / Cards; header sync pushes dirty local edits before pull
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

New vaults start with empty history. Home offers loading samples when empty or **Track Data**; Settings can **load** or **delete** synthetic H1 2026 (`2026-01`–`2026-06`). See [DATA-MODEL.md](./DATA-MODEL.md).

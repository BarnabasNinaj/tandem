# Product & UX

## Positioning

Private household operating system for a couple — calm, local-first, not a bank or fintech SaaS. Copy should never imply “create an account” or “cloud subscription.” Sync language: **private vault / GitHub**, not “our servers.”

## Surfaces

| Surface | Purpose |
|---------|---------|
| Setup | Join via invite QR **or** manual GitHub + PAT + password |
| Lock | Unlock with master password (no vault path shown) |
| Home | Hero: **BALU** | **Last updated** | net worth | **Track Data**; then pocket split, flow, reserves |
| Analytics | Charts over `history` (Recharts; distinct series colors — sky / green / orange + multi-hue pie) |
| Settings | Household (names, emergency/auto-lock), categories, GitHub, invite QR, password rotate, H1 sample load/delete, JSON backup — not currency/locale |
| Track Data wizard | Incomes → Expenses → Allocations; compact **Split** bar (expenses + pocket; **50/50** / **Income**) |

Nav labels: **Home**, **Analytics**, **Settings**. Brand mark: **Tandem** (`Fugaz One`, teal).

## Visual system (`src/index.css`)

| Token | Light | Role |
|-------|-------|------|
| `--logo` | `#0f766e` | Brand / accents |
| `--bg` | `#eef1ef` | Page ground |
| `--surface` | `#ffffff` | Panels |
| Fonts | Plus Jakarta Sans + Fugaz One | Body / logo |

Dark theme via `.dark` on root (hook `use-theme`). Setup/lock use light canvas + `.logo-mark-on-light`.

Motion: `fadeUp` keyframes; Home hero reveal. Prefer subtle transitions over noisy animations.

UI primitives: `src/components/ui/*` (button, input, card, label, money-input, progress). Clickable controls use `cursor-pointer` (hand) on hover, not the default arrow.

## Shortcuts (ready phase)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | Open Track Data wizard (draft from current month + last record) |
| `Ctrl/Cmd + S` | If wizard open with draft → save month; else → push vault |

## Dates & money

- Display dates: **DD/MM/YYYY** (and `DD/MM/YYYY HH:mm` for sync times)
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

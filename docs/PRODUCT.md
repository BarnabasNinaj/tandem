# Product & UX

## Positioning

Private household operating system for a couple — calm, local-first, not a bank or fintech SaaS. Copy should never imply “create an account” or “cloud subscription.” Sync language: **private vault / GitHub**, not “our servers.”

## Surfaces

| Surface | Purpose |
|---------|---------|
| Setup | Join via invite QR **or** manual GitHub + PAT + password |
| Lock | Unlock with master password |
| Home | Net worth hero, emergency runway, travel fund, allowance, savings rate, CTA to close month |
| Trajectory | Charts over `history` (Recharts) |
| Settings | Household, categories, GitHub, invite QR, password rotate, demo load, JSON backup |
| End-of-Month wizard | 3 steps: Inflows → Outflows → Allocations (+ portfolio snapshot / notes) |

Nav labels: **Home**, **Trajectory**, **Settings**. Brand mark: **Tandem** (`Fugaz One`, teal).

## Visual system (`src/index.css`)

| Token | Light | Role |
|-------|-------|------|
| `--logo` | `#0f766e` | Brand / accents |
| `--bg` | `#eef1ef` | Page ground |
| `--surface` | `#ffffff` | Panels |
| Fonts | Plus Jakarta Sans + Fugaz One | Body / logo |

Dark theme via `.dark` on root (hook `use-theme`). Setup/lock use light canvas + `.logo-mark-on-light`.

Motion: `fadeUp` keyframes; Home hero reveal. Prefer subtle transitions over noisy animations.

UI primitives: `src/components/ui/*` (button, input, card, label, money-input, progress).

## Shortcuts (ready phase)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | Open End-of-Month wizard (draft from current month + last record) |
| `Ctrl/Cmd + S` | If wizard open with draft → save month; else → push vault |

## Dates & money

- Display dates: **DD/MM/YYYY** (and `DD/MM/YYYY HH:mm` for sync times)
- Month labels: **MM/YYYY** from `YYYY-MM` keys
- Money: `formatMoney` + locale; inputs via `MoneyInput` / `parseLocaleNumber` (`,` and `.`)

## Auto-lock

Idle timer from `settings.autoLockMinutes` (default 30). Events: mousemove, keydown, touchstart, click, scroll. Calls `lock()` → clears session secrets + draft.

## Partner onboarding story

1. Partner A creates private data repo + PAT, completes manual setup, sets password.
2. Partner A opens Settings → Add a device → Show invite QR.
3. Partner B scans on setup, enters **same** master password, unlocks existing vault.
4. Both edit months; pull when needed; resolve conflicts consciously.

## Empty / demo states

New vaults start with empty history. Home offers loading samples when empty; Settings can load/overwrite `2026-09` / `2026-10`. See [DATA-MODEL.md](./DATA-MODEL.md).

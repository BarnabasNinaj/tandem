# Agent guide — Tandem

Read this before changing code. Deep docs live in [`docs/`](./docs/). Cursor rules in [`.cursor/rules/`](./.cursor/rules/) reinforce the same facts.

## What this is

**Tandem** is a local-first household finance PWA for couples. There is **no app backend**. Encrypted vault sync uses the GitHub Contents API against a **separate private data repo**.

| Repo | Role | Visibility |
|------|------|------------|
| **`tandem`** (this repo) | Static app | May be public |
| **Data repo** (e.g. `tandem-data`) | `tandem_data.json.enc` only | **Always private** |

Do not treat the data repo as “optional secrets.” It **is** the sync store.

## Non-negotiables

1. No server, SaaS DB, or third-party auth unless the user explicitly redesigns the product.
2. Never commit PATs, passwords, invite links / pairing codes, or real vault JSON.
3. Never suggest making the **data** repo public.
4. Crypto/sync/schema changes go through `crypto.ts` / `github.ts` / `migration.ts` / `types/tandem.ts` — preserve envelope `v: 1` and SHA locking.
5. UI dates: **DD/MM/YYYY**. Month keys: `YYYY-MM`. Money: `round2` / `finance.ts`.
6. Sync and unlock flows only via `useTandemStore` — components don’t call GitHub directly (except setup’s `testGitHubConnection`).
7. **Docs stay current:** any behavior/API/UX/security/deploy change updates the matching files under `docs/`, plus `README.md` / `AGENTS.md` / `.cursor/rules/` when relevant — **in the same change**, not later. See `.cursor/rules/docs-must-stay-current.mdc`.

## Map

| Concern | Where |
|---------|--------|
| Domain types | `src/types/tandem.ts` |
| Orchestration | `src/store/tandem-store.ts` |
| Crypto | `src/lib/crypto.ts` |
| GitHub vault I/O | `src/lib/github.ts` |
| Browser keys | `src/lib/storage.ts` |
| Month math + settlement | `src/lib/finance.ts` (`settleExpenseShares`, `paymentByOwner`) |
| Analytics (averages, trends, outlook) | `src/lib/analytics.ts` |
| Bank label mappings + card merge | `src/lib/card-expenses.ts` |
| Partner / owner colors | `src/lib/partners.ts`, `OwnerBadge` |
| Migrations | `src/lib/migration.ts` |
| Device invite | `src/lib/device-invite.ts` |
| Page title band | `src/components/layout/PageHeader.tsx` (sticky under app nav; analytics adds range via `AnalyticsPageHeader`) |
| Page frame (sticky above body) | `src/components/layout/PageShell.tsx` — wrap every ready-phase page (`isolate` + body `z-0`) |
| Section / meta type | `src/components/layout/SectionHeading.tsx` (`SectionHeading` + `MetaLabel`; in-card titles use `CardTitle`) |
| Auth canvas (boot/setup/lock) | `src/components/lock/AuthShell.tsx` + `public/auth-shell.css` |
| Self-hosted fonts | `public/fonts/` + `src/lib/fonts.css` |
| Routes / phases | `src/App.tsx` (`/` Home, `/track`, `/history`, `/incomes`, `/expenses`, `/outlook`, `/settings`) |
| Home (`/` — logo + nav) | `src/components/home/HomePage.tsx` + `buildHomeOverview` in `analytics.ts` |
| Track (month entry) | `src/components/track/TrackPage.tsx` + `MonthEditor.tsx` + `CardExpenses.tsx` (card-first expense entry) |
| History / Incomes / Expenses / Outlook UI | `src/components/analytics/` (legend click: `use-legend-filter.ts`; pies: `PieBreakdown.tsx`) |

## Commands

```bash
npm run dev      # http://localhost:5280 (strict)
npm run build
npm run lint     # oxlint
npm test         # vitest (lib suite — T1A). After edits: run → report → fix → re-run until green
npm run preview
npm run icons    # regenerate public/pwa-*.png + apple-touch-icon.png from favicon mark
```

## Docs index

- [Architecture](./docs/ARCHITECTURE.md)
- [Data model](./docs/DATA-MODEL.md)
- [Security](./docs/SECURITY.md)
- [Sync & storage](./docs/SYNC-AND-STORAGE.md)
- [Product / UX](./docs/PRODUCT.md)
- [Deployment](./docs/DEPLOYMENT.md)
- [Audit findings](./docs/AUDIT.md)

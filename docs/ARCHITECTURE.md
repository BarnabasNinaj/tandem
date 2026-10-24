# Architecture

## Overview

Tandem is a **static Progressive Web App**. All business logic runs in the browser. Persistence of household data is an **AES-GCM encrypted JSON envelope** stored as a single file in a private GitHub repository.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (PWA)                                              │
│  phases: booting → setup | locked → unlocking → ready       │
│                                                             │
│  sessionStorage: password, unlock flag, vault cache         │
│  localStorage: GitHub config (+ PAT), theme, enc. draft     │
│  memory (Zustand): decrypted TandemState while ready        │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS + Fine-Grained PAT
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Private GitHub data repo (e.g. tandem-data)                │
│  File: tandem_data.json.enc  (= EncryptedEnvelope JSON)     │
│  Concurrency: Git blob SHA (optimistic lock)                │
└─────────────────────────────────────────────────────────────┘
```

The **app repo** (`tandem`) is unrelated to vault contents. Deploying the app and syncing the vault are different concerns.

## App phases

Defined in `src/store/tandem-store.ts` / gated in `src/App.tsx`:

| Phase | UI | Meaning |
|-------|-----|---------|
| `booting` | Splash | Loading GitHub config; may quiet-unlock from session |
| `setup` | `SetupWizard` | No local GitHub config yet |
| `locked` / `unlocking` | `LockScreen` | Config present; need master password |
| `ready` | Router + `AppShell` | Decrypted state in memory |
| `error` | (via store `error`) | Surfaced in shell banner |

## Routing (only when `ready`)

| Path | Screen |
|------|--------|
| `/` | Home (`Dashboard`) |
| `/history` | History (`HistoryPage` — history charts) |
| `/incomes` | Incomes (`IncomesPage` — income buckets only) |
| `/expenses` | Expenses (`ExpensesPage` — category spend only) |
| `/outlook` | Outlook (`OutlookPage` — averages & projections) |
| `/trends` | Redirect → `/history` |
| `/analytics` | Redirect → `/outlook` |
| `/breakdown` | Redirect → `/history` |
| `/settings` | `Settings` |

Global overlays in `AppShell`: `MonthlyWizard`, `ConflictDialog`.

## Layering

```
components/*     →  UI only; select store slices
hooks/*          →  auto-lock, shortcuts, theme
store/*          →  boot, unlock, pull/push, wizard, import
lib/finance      →  pure month math
lib/analytics    →  range slices, income buckets, expense grid, category trends, outlook projections
lib/card-expenses → paste card monthly totals, map labels, merge into outflows
lib/crypto       →  Web Crypto envelope
lib/github       →  Contents API
lib/storage      →  localStorage / sessionStorage keys
lib/migration    →  vault version normalize
types/tandem     →  single source of domain truth
```

**Rule:** feature components must not invent parallel persistence. Call store actions.

## Stack choices (intentional)

| Choice | Why |
|--------|-----|
| Vite static build | No server to operate |
| Zustand | Small global store for vault lifecycle |
| Web Crypto | Zero-knowledge relative to GitHub |
| GitHub Contents API | Free private blob store partners already have |
| PWA (`vite-plugin-pwa`) | Installable; offline shell via Workbox |
| Dev port `5280` | Avoid clashing with other localhost PWAs/caches |

## What is explicitly out of scope

- Multi-tenant accounts, OAuth login for the app itself
- Server-side encryption or key custody
- Per-field CRDT / automatic month merges
- Bank integrations, OCR, cloud sync vendors

Changing any of the above is a product redesign, not a small PR.

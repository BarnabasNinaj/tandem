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
| `booting` | Empty (themed `body` only) | **Only** quiet session restore (password in sessionStorage) |
| `setup` | `SetupWizard` on `AuthShell` | No local GitHub config yet |
| `locked` / `unlocking` | `LockScreen` on `AuthShell` | Config present; need master password |
| `ready` | Router + `AppShell` | Decrypted state in memory |
| `error` | (via store `error`) | Surfaced in shell banner |

`resolveInitialGate()` sets `setup` / `locked` / `booting` **synchronously** so the first React paint is the real gate (or blank canvas during quiet unlock). **Never** paint a logo-only splash. When GitHub config exists and there is no session password, `index.html` paints a **full static lock shell** into `#root` using `public/auth-shell.css` (same classes as React `AuthShell` / `LockScreen`) so refresh doesn’t reflow; focus uses `preventScroll`. Fugaz + Jakarta are preloaded/self-hosted.

## Routing (only when `ready`)

| Path | Screen |
|------|--------|
| `/` | Home (`HomePage` — month scroller; logo + first nav tab) |
| `/track` | Track (`TrackPage` hub ↔ `MonthEditor` when a draft is active; delete month via store) |
| `/history` | History (`HistoryPage` — history charts) |
| `/incomes` | Incomes (`IncomesPage` — income buckets only) |
| `/expenses` | Expenses (`ExpensesPage` — category spend only) |
| `/outlook` | Outlook (`OutlookPage` — averages & projections) |
| `/trends` | Redirect → `/history` |
| `/analytics` | Redirect → `/outlook` |
| `/breakdown` | Redirect → `/history` |
| `/settings` | `Settings` |

Global overlays in `AppShell`: `ConflictDialog` only. Month entry lives on Track (`MonthEditor`), not a modal.

## Layering

```
components/*     →  UI only; select store slices
hooks/*          →  auto-lock, shortcuts, theme
store/*          →  boot, unlock, pull/push, track draft, import
lib/finance      →  pure month math
lib/analytics    →  range slices, income buckets, expense grid, category trends, outlook projections
lib/card-expenses → bank-scoped label mappings + merge amounts into outflows
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

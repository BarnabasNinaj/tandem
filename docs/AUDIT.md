# Full audit (2026-10-23)

Scope: repository `tandem` as of this date — architecture, security, sync, UX conventions, tooling. No penetration test; static review of source.

## Verdict

The design matches the product claim: **static PWA + encrypted GitHub vault**, clear phase machine, SHA-based conflict UI, and sensible browser storage split. Main risks are **XSS-equivalent trust of the app origin**, **PAT-in-invite**, and a few **product footguns** (demo seed on first vault, unsynced settings). Tooling gap: **no automated tests**.

## Executive summary

**Fit:** Architecture is the right shape for a two-person household OS. Do not add a backend to “fix” audit items.

**What to worry about first:** (1) demo months accidentally becoming someone’s first real vault, (2) Settings edits that never got Save & sync, (3) force-overwrite wiping a partner’s month, (4) operational handling of invite QR / PAT, (5) keeping the **app** deployable on Hobby without exposing the **data** repo.

**What is inherent, not a bug:** Browser crypto means the app origin is fully trusted while unlocked (S1). PAT in localStorage and password in sessionStorage (S3–S4) are the UX tradeoff that enables refresh-without-retype and persistent sync config. Mitigate with lock discipline, no third-party scripts, and tight PAT scope — not by inventing a server.

**What is already good:** Single store orchestration, fail-closed envelope/version parsing, encrypted wizard drafts, SHA conflict dialog (even if blunt), clear app-vs-vault repo split once documented.

### Highlight elaborations

#### C3 — First vault seeds demo months (Low) — **resolved (C3A)**

Was: `createInitialState()` seeded demo months by default. **Now:** empty history by default; `completeSetup` / empty-remote unlock pass `withDemoData: false`; samples only via Settings or `withDemoData: true`.

#### C2 — Unsynced Settings can vanish (Medium) — **mitigated (C2A)**

Was: pull / background refresh could wipe in-memory Settings (cards, categories, etc.). **Now:** `localDirty` after `updateState`; pull pushes local first when dirty; quiet-unlock background refresh skips while dirty; Categories/Banks tabs have **Save & sync**. **Still open:** lock without Save & sync still drops unsynced memory — dirty banner on lock would close the rest.

#### C1 — Conflicts are pull or overwrite (Medium)

One encrypted blob + SHA locking is correct; there is no per-month merge. Overwrite replaces the entire remote vault. Impact: two partners closing different months can lose one side’s work on force overwrite. **Fix (near-term):** show `updatedAt` + month-key set diff in `ConflictDialog`. **Later:** merge `history` by month key only if this actually bites.

#### S1 — XSS on app origin (High, inherent)

Unlocked session holds password, PAT, and plaintext state. GitHub never sees plaintext, but **same-origin JS does**. Impact: malicious script or supply-chain hit on the deployed app origin exfiltrates everything. **Stance:** accept for local-first Web Crypto; shrink attack surface (no analytics SDKs, prefer self-hosted fonts, optional CSP).

#### S2 — Device invite embeds PAT (High, operational)

Invite encodes `{ username, repo, pat }` — intentionally not the master password. Impact: a photo of the QR is data-repo write access. **Stance:** by design for zero-backend pairing; warn in UI; show briefly; rotate PAT after pairing; never paste invites into Slack/email/docs. Redesigning to short-lived setup codes is a larger product change.

#### T1 — No automated tests (Tooling gap)

Finance math, crypto round-trip, migrations, and invite codec have no unit coverage. Impact: easy to regress vault safety or month math. **Fix:** small Vitest (or similar) suite on pure `lib/*` before growing features.

## Roadmap (proposed)

### Now

1. C3 — **done (C3A).**
2. Deploy — **`tandem` is public** (2026-10-23); **data repo stays private**.
3. Git author email verified on the GitHub user linked to Vercel (still worth confirming after first public deploy).
4. After partner setup, optionally rotate Fine-Grained PAT (invite may have been shown).

### Next

1. C2 — dirty banner / warn on lock (pull overwrite mitigated in C2A).
2. C1 — richer conflict dialog (month keys / timestamps).
3. T1 — unit tests for finance, crypto, migrate, invite.
4. S1/S8 — self-host fonts; optional CSP headers on Vercel.

### Later (only if pain)

1. Per-month history merge on conflict.
2. Invite without long-lived PAT in QR.
3. Stronger password policy / salt rotate on password change.
4. CI: lint + tests on push.

### Explicit non-goals from this audit

No backend, no third-party sync DB, no OAuth “app accounts,” no public data repo, no weakening PBKDF2 for snappier unlock.

## Decision ballot (vote)

| ID | Vote | Choice |
|----|------|--------|
| **C3** | **A** ✓ | Empty vault on create; samples only via Settings |
| **C2** | **B** | Autosave / autopush settings (debounced) |
| **C1** | **A** | Richer conflict dialog (month keys / timestamps) |
| **S1** | **A** | Harden deploy surface (self-host fonts + CSP) |
| **S2** | **D** | Accept invite-embeds-PAT as-is (current UI warnings) |
| **T1** | **A** ✓ | Minimal Vitest lib suite implemented (`npm test`; no CI) |

**Recommended slate was:** all A. **Recorded:** C3A C2B C1A S1A S2D T1A.

### T1 — testing options (expanded)

Goal: catch vault/math regressions without a heavyweight QA program.

| Option | What you get | Effort | Ongoing cost |
|--------|----------------|--------|--------------|
| **A — Minimal lib suite** | Vitest + ~8–15 tests: `computeMonthly` / `round2`, encrypt↔decrypt round-trip, `migrateState` happy path, `decodeDeviceInvite` valid/invalid. Run with `npm test` locally. | ~0.5–1 day | Run before risky PRs |
| **B — Minimal + CI** | Same as A, plus GitHub Action on push/PR (`lint` + `test`). Fails merge if red. | A + ~1 hour | Free minutes on Actions; protects main |
| **C — Comfortable lib coverage** | A/B plus: conflict SHA error mapping (mock fetch), `buildMonthlyRecord` edge cases, `parseEnvelope` reject bad `v`, empty-history `createInitialState({ withDemoData: false })`. Still no browser e2e. | ~1–2 days | Slightly more tests to maintain |
| **D — Smoke e2e later** | Playwright: open app → (mocked GitHub) unlock path or setup validation only. High flake risk if not mocked well. | Multi-day | Higher maintenance |
| **E — Skip automated tests** | Manual only. | 0 | Regressions only found in real use |

**For “a bit of testing would be nice”:** **A** or **B** is the sweet spot. Prefer **B** if the repo is on GitHub and you already push often — CI is cheap insurance on top of a small suite. Choose **C** only if you want the safety net to cover sync/migration edges while implementing C3/C1. Defer **D** until unit tests exist.

**Implemented (T1A):** Vitest + tests in `src/lib/{finance,crypto,migration,device-invite}.test.ts`. Scripts: `npm test`, `npm run test:watch`. No GitHub Actions yet (that would be T1B).

**Agent workflow:** after code changes, run `npm test`, report pass/fail to the user, fix failures, re-run until green (see `.cursor/rules/coding-conventions.mdc`). The suite does not auto-run in CI; the loop is agent-driven (optional: `npm run test:watch` in a local terminal for continuous feedback while editing).

## Architecture — healthy

- Clear separation: app repo vs data repo (documented).
- Single orchestration point (`tandem-store.ts`).
- Domain math centralized (`finance.ts`).
- Envelope parsing fail-closed; migrations fail on unknown version.
- PWA + SPA rewrite appropriate for static host.

## Security findings

| ID | Severity | Finding | Notes |
|----|----------|---------|--------|
| S1 | High (inherent) | XSS on app origin ⇒ password + PAT + vault | Accept for browser crypto apps; avoid third-party scripts; keep CSP in mind if ever added |
| S2 | High (ops) | Device invite embeds PAT | By design; UI warns; agents must not soften this |
| S3 | Medium | PAT in `localStorage` | Survives tab close; any XSS / shared browser profile can read it |
| S4 | Medium | Password in `sessionStorage` | Cleared on lock; still readable to same-origin script while unlocked |
| S5 | Medium | JSON export is plaintext | Documented as emergency-only; treat as secret file |
| S6 | Low | Password min length 8 | UI-only; consider stronger guidance later |
| S7 | Low | Salt not rotated on password change | Re-encrypts ciphertext; salt reuse is common but worth knowing |
| S8 | Info | No Subresource Integrity on Google Fonts CSS | Supply-chain/privacy consideration for fonts CDN |

**Data repo privacy:** required. Ciphertext alone is not an excuse to go public (metadata, targeted offline attack on password, invite confusion).

## Sync / correctness findings

| ID | Severity | Finding |
|----|----------|---------|
| C1 | Medium | No merge of month histories — overwrite discards remote |
| C2 | Medium | Unsynced Settings lost on pull/background refresh — **mitigated (C2A)** (`localDirty`, push-before-pull); lock without Save still drops memory |
| C3 | Low | ~~defaults to demo months~~ → **C3A done:** empty history by default; demo via Settings / `withDemoData: true` |
| C4 | Low | GitHub `atob` decode path vs `btoa(unescape(encodeURIComponent))` encode — OK for ASCII JSON envelope; watch if envelope ever gains non-Latin1 outside JSON.stringify norms |
| C5 | Info | Retries don’t handle secondary rate-limit UX beyond generic errors |
| C6 | Info | `GitHubNotFoundError` class exists but fetch returns `null` on 404 instead |

## Product / UX findings

| ID | Notes |
|----|--------|
| P1 | Strong brand/visual tokens; Track as month entry (overview Home removed — review lives on History / Incomes / Expenses / Outlook) |
| P2 | Invite path skips password confirm (correct — joining existing vault) |
| P3 | Wizard autosave encrypted — good |
| P4 | Auto-lock effect depends on whole `state` object — timer resets on any state update (may delay lock while actively editing; usually fine) |
| P5 | ~~Defaults `sk-SK` / `€` in Settings~~ → **fixed:** money always EUR; locale not user-facing (`CURRENCY_*` in `number.ts`) |

## Tooling findings

| ID | Finding |
|----|---------|
| T1 | ~~No unit tests~~ → **T1A done:** Vitest lib suite (`npm test`). Still no e2e/CI |
| T2 | Lint: oxlint only; no CI config in repo |
| T3 | `.vercel` gitignored — good |
| T4 | README previously under-specified two-repo model — addressed in this doc pass |

## Recommended follow-ups (optional product work)

1. **First vault:** `createInitialState({ withDemoData: false })` in `completeSetup` / empty-remote unlock; keep demo behind Settings only.
2. **Settings:** auto-push on blur or dirty banner if unsynced.
3. **Tests:** `finance.computeMonthly`, `migrateState`, `parseEnvelope` / round-trip encrypt, `decodeDeviceInvite`.
4. **CSP / drop remote fonts** if hardening the deploy origin.
5. **Conflict UX:** show remote vs local `updatedAt` / month keys before overwrite.

## Doc & rules coverage after this audit

| Doc | Path |
|-----|------|
| Agent entry | `AGENTS.md` |
| Architecture | `docs/ARCHITECTURE.md` |
| Data model | `docs/DATA-MODEL.md` |
| Security | `docs/SECURITY.md` |
| Sync | `docs/SYNC-AND-STORAGE.md` |
| Product | `docs/PRODUCT.md` |
| Deploy | `docs/DEPLOYMENT.md` |
| This audit | `docs/AUDIT.md` |

Cursor rules under `.cursor/rules/` mirror the above for session enforcement.

### Process: keep docs forever current

Always-on rule `.cursor/rules/docs-must-stay-current.mdc`: every behavior/API/UX/security/deploy change updates the matching `docs/*` (and `AGENTS.md` / `README.md` / rules when needed) **in the same turn**. Stale docs after a code change are treated as an incomplete task.

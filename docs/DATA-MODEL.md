# Data model

Source of truth: `src/types/tandem.ts`. Migrations: `src/lib/migration.ts`.

## Vault file

- **Filename:** `tandem_data.json.enc` (`DATA_FILENAME`)
- **On disk (GitHub):** JSON string of `EncryptedEnvelope`
- **After decrypt:** `TandemState`

### EncryptedEnvelope (`v: 1`)

| Field | Meaning |
|-------|---------|
| `v` | Envelope version (`1`) |
| `salt` | Hex salt for PBKDF2 (also stored on state) |
| `iv` | Base64 AES-GCM IV (12 bytes) |
| `ciphertext` | Base64 ciphertext of UTF-8 JSON `TandemState` |

Unrecognized `v` or missing fields → hard error (`parseEnvelope`).

### TandemState (`version: '1.0'`)

| Field | Type | Notes |
|-------|------|--------|
| `version` | `'1.0'` | Bump + migrate when schema changes |
| `updatedAt` | ISO string | Vault-level timestamp |
| `salt` | hex string | Stable per household; do not rotate casually |
| `settings` | `TandemSettings` | Partners, categories, auto-lock (money fixed EUR) |
| `history` | `Record<monthKey, MonthlyRecord>` | Keys `YYYY-MM` |

### TandemSettings

| Field | Default (new vault) |
|-------|---------------------|
| `currencySymbol` | always `€` (not Settings-editable; migration overwrites) |
| `currencyLocale` | always `sk-SK` number style (not Settings-editable; for `Intl` grouping) |
| `dateFormat` | always `DD/MM/YYYY` (enforced; schema anchor, not Settings-editable) |
| `partnerAName` / `partnerBName` | `Barney` / `Lucka` (legacy “Partner A/B” remapped on migrate) |
| `allowanceSplit` | Splits **expenses** (Pays) and **Net** (Net share): `equal` (both 50/50) · `income` (both ∝ salaries; Other excluded) · `incomeEqualNet` (Pays by income, Net share 50/50) |
| `categories` | `DEFAULT_CATEGORIES` |
| `banks` | `[]` — `{ id, name }` issuers; each has its own expense-label taxonomy |
| `cards` | `[]` — `{ id, name, bankId, owner: partnerA\|partnerB\|common }` entry sources |
| `categoryMappings` | `[]` — `{ bankId, key, label, categoryId }` bank label → household category |
| `autoLockMinutes` | `30` |

### MonthlyRecord

Built by `buildMonthlyRecord` in `finance.ts` (never hand-roll `computed`).

**Incomes** (UI; stored as `inflows`, only three): `partnerASalary` (Barney), `partnerBIncome` (Lucka), `otherInflows` (Other). Legacy `childSupport` is folded into `otherInflows` on migrate.

**Expenses** (UI; stored as `outflows`): `{ categoryId, categoryName, amount }[]`

**Card expenses (Track editor → Expenses):** card-first. Pick a **card** (clickable chips) → enter amounts for that card’s **bank** labels (shared by all cards of the bank; each mapped to a household category) → **Add to month** merges (adds) into `outflows` **and** bumps `paymentByOwner` for that card’s `owner` by the sheet total. Month category totals update below (read-only rollup). **New label** (+) writes `categoryMappings` on the bank immediately (no payment bump). Typed sheet amounts are local until Add (or until **Save month**, which flushes any pending sheet). Switching the editor month clears the sheet. Per-line card ids are not stored — only category rollups + owner payment buckets. UI: `CardExpenses.tsx`; merge/mappings: `src/lib/card-expenses.ts`. Investment transfers (if tracked) are expense categories via cards — there is no separate allocations / portfolio snapshot on the month.

**Who paid (stored):**

```
paymentByOwner = { partnerA, partnerB, common }  // additive card-sheet totals
```

Missing / all-zero on older months and demo samples → no settlement UI (do not invent history).

**Computed (derived, stored for history):**

```
X = totalInflow = sum(incomes)
Y = totalOutflow = sum(expenses)
Z = leftoverAfterExpenses = X − Y
discretionarySurplus = Z   // household leftover pool (UI: Net)

Preset (allowanceSplit) splits Y and Z (ratios may differ):
  equal           → Y 50/50, Z 50/50
  income          → Y and Z ∝ partnerASalary : partnerBIncome (Other excluded)
  incomeEqualNet  → Y by income, Z 50/50

Helpers: `expenseSplitRatio` / `netShareSplitRatio` in `finance.ts`.

expenseSharePartnerA / B          // fair “Pays” share of Y
personalAllowancePartnerA / B     // each partner’s fair “Net share” of Z
                                  // (fairness target on combined leftover —
                                  //  not what’s left in that partner’s account)
```

**Settlement** (derived in `settleExpenseShares`, not stored): effective paid = personal bucket + that partner’s split of `common` (uses **expense** ratio from the preset). Net = effectivePaid − expenseShare. Positive for A ⇒ transfer B → A. Shown on Track footer + Home when `paymentByOwner` has data. Settle only equalises **expense** over/underpayment — it does **not** move money to match Net-share targets when incomes differ.

All money values rounded with `round2`.

**Savings rate:** `(totalInflow − totalOutflow) / totalInflow * 100`.

**Migration:** older vault months that still have `allocations` / `portfolioSnapshot` drop those fields on `normalizeHistory` and recompute. Missing `paymentByOwner` → `{0,0,0}`. Settings drop unused `emergencyTargetMonths` (never consumed). Recomputed months omit unused `personalAllowancePerPartner` (Z/2 was always derivable from A+B or Z).

### Analytics (derived, not stored)

`src/lib/analytics.ts` reads `history` only — no vault schema fields.

| Signal | How |
|--------|-----|
| Range slice | Last 3 / 6 / 12 months or all |
| Category average | Mean monthly spend (missing month = €0) |
| Category trend | OLS slope €/month over the range |
| Month outlook | Trailing means for income, expenses, leftover/net (Z); `totalPocket` = sum of Z over the range (UI: **Net**); looking-ahead **Net** tile shows avg € and `(Z/X)%` — one baseline (no stamped multi-month projection rows). Captions: left after expenses / short this month (`netCaption`) |

**Not in the model:** partner bank balances / cash-on-hand. Months are cashflow (in/out), not a balance sheet. **Net share** is each partner’s fair slice of household Net — not what remains in their account after salary − Pays. Range **Net** is Σ(income − expenses) since tracking in that slice — opening cash and untracked movements are invisible. A current as-of snapshot could live in Settings later for runway; it must not be projected onto past month keys.

Focus month defaults to the current calendar month (`toMonthKey()`). If that month is already in `history`, Outlook shows deltas vs the trailing average.

UI slices of the same history (no extra stored fields): `/history` (mixed charts), `/incomes` (`incomeMonths` — three buckets only), `/expenses` (`expenseGrid` — category rows × month columns; same mix pie as History via `PieBreakdown`), `/outlook` (baselines).

## Track draft

`WizardDraft` (name kept in `finance.ts`) mirrors a month while editing on Track. Autosaved every 5s while the editor is active as an encrypted blob in `localStorage` (`tandem.draft.enc`), using the vault salt + master password. Track hub can **Resume** a leftover draft after Cancel.

`draftForMonth(history, monthKey, categories)` loads an existing `MonthlyRecord` for edit, or `emptyDraft` seeded from the prior month. Saving overwrites `history[monthKey]` and clears the encrypted draft.

`updateState` realigns both the open draft (`alignDraftToCategories`) and **all saved months** (`alignHistoryToCategories`) to current `settings.categories` — renames refresh `categoryName` on history (so History / Expenses / Outlook match Settings); removed ids drop; new ids appear at €0. Unlock/`migrateState` also appends any missing stock defaults (e.g. `investments`) via `ensureDefaultCategories`, then realigns history.

Sample months (`buildDemoHistory(categories)`) key amounts by category **id** and use the household’s current names — reload samples after a rename to refresh demo labels.

## GitHubConfig (browser only — not in vault)

```ts
{ username, repo, pat, branch? }  // branch defaults to main in API calls
```

Stored under `localStorage` key `tandem.github`. Device invites encode `username` / `repo` / `pat` only — **not** the master password.

## Schema evolution

1. Extend types in `types/tandem.ts`.
2. Add migration branch in `migrateState` (chain from older versions).
3. Keep `normalizeV1` defensive for missing fields.
4. Never silently drop history months.

Unsupported `version` → throw (fail closed).

## Demo history

`buildDemoHistory()` seeds **full-year 2026** (`2026-01` … `2026-12`) with synthetic data — partner A/B salaries, Other, and every expense category vary widely month to month (mid-year leave dip, summer travel + back-to-school deficits, spring/autumn surplus, Dec holiday overshoot). Several months finish with **negative** leftover so Home / History / Outlook show deficit months. Keys: `DEMO_MONTH_KEYS` in `demo-data.ts`. `stripDemoMonths` removes the current pack keys on load/clear.

**C3A (2026-10-23):** `createInitialState()` defaults to **empty** `history`. Demo only when `withDemoData: true` or Settings → Load 2026 / Delete sample data (`loadDemoData` / `clearDemoData`, then push). Setup / empty-remote unlock create empty vaults.

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
| `dateFormat` | always `DD/MM/YYYY` (enforced) |
| `emergencyTargetMonths` | `6` |
| `partnerAName` / `partnerBName` | `Barney` / `Lucka` (legacy “Partner A/B” remapped on migrate) |
| `allowanceSplit` | Splits **expenses** and **pocket**: `equal` or `income` (Barney/Lucka ratio; Other excluded) |
| `categories` | `DEFAULT_CATEGORIES` |
| `banks` | `[]` — `{ id, name }` issuers; each has its own expense-label taxonomy |
| `cards` | `[]` — `{ id, name, bankId, owner: partnerA\|partnerB\|common }` entry sources |
| `categoryMappings` | `[]` — `{ bankId, key, label, categoryId }` bank label → household category |
| `autoLockMinutes` | `30` |

### MonthlyRecord

Built by `buildMonthlyRecord` in `finance.ts` (never hand-roll `computed`).

**Incomes** (UI; stored as `inflows`, only three): `partnerASalary` (Barney), `partnerBIncome` (Lucka), `otherInflows` (Other). Legacy `childSupport` is folded into `otherInflows` on migrate.

**Expenses** (UI; stored as `outflows`): `{ categoryId, categoryName, amount }[]`

**Add from card (Track editor → Expenses):** pick a card → enter amounts for that **bank’s** remembered labels (each mapped to a household category) → **merge** (add) into `outflows`. New labels can be added inline and are saved on the bank. Cards themselves are not stored on the month — only the rolled-up categories. Merge/mappings: `src/lib/card-expenses.ts`.

**Allocations (this month’s transfers off the spending pool):**  
`emergencyReserve`, `travelFund`, `investments`

**Portfolio snapshot (balances at close):**  
`emergencyReserveBalance`, `travelFundBalance`, `externalInvestmentsBalance`, `liquidCashBalance`

**Computed (derived, stored for history):**

```
X = totalInflow = sum(incomes)
Y = totalOutflow = sum(expenses)
Z = leftoverAfterExpenses = X − Y
pocket pool = discretionarySurplus = Z − sum(allocations)

Toggle (allowanceSplit) splits Y and the pocket pool:
  equal  → 50/50
  income → ∝ partnerASalary : partnerBIncome (Other excluded from ratio)

expenseSharePartnerA / B
personalAllowancePartnerA / B   // pocket money
personalAllowancePerPartner     // pocket/2 reference
```

All money values rounded with `round2`.

**Net worth:** sum of portfolio snapshot balances (not a separate stored field); shown on History charts.

**Savings rate:** `(totalInflow − totalOutflow) / totalInflow * 100` — Z counts as saved (allocations come from Z).

### Analytics (derived, not stored)

`src/lib/analytics.ts` reads `history` only — no vault schema fields.

| Signal | How |
|--------|-----|
| Range slice | Last 3 / 6 / 12 months or all |
| Category average | Mean monthly spend (missing month = €0) |
| Category trend | OLS slope €/month over the range |
| Month outlook | Trailing means for income, expenses, pocket, savings rate → project next 3 calendar months |
| Net-worth projection | Last snapshot NW + average leftover after expenses (Z) per projected month |

Focus month defaults to the current calendar month (`toMonthKey()`). If that month is already in `history`, Outlook shows deltas vs the trailing average.

UI slices of the same history (no extra stored fields): `/history` (mixed charts), `/incomes` (`incomeMonths` — three buckets only), `/expenses` (`expenseGrid` — category columns only), `/outlook` (baselines).

## Track draft

`WizardDraft` (name kept in `finance.ts`) mirrors a month while editing on Track. Autosaved every 5s while the editor is active as an encrypted blob in `localStorage` (`tandem.draft.enc`), using the vault salt + master password. Track hub can **Resume** a leftover draft after Cancel.

`draftForMonth(history, monthKey, categories)` loads an existing `MonthlyRecord` for edit, or `emptyDraft` seeded from the prior month. Saving overwrites `history[monthKey]` and clears the encrypted draft.

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

`buildDemoHistory()` seeds **H1 2026** (`2026-01` … `2026-06`) with synthetic data. Keys: `DEMO_MONTH_KEYS` in `demo-data.ts`. Legacy Sep/Oct (`2026-09`, `2026-10`) are stripped on load/clear via `stripDemoMonths`.

**C3A (2026-10-23):** `createInitialState()` defaults to **empty** `history`. Demo only when `withDemoData: true` or Settings → Load H1 / Delete sample data (`loadDemoData` / `clearDemoData`, then push). Setup / empty-remote unlock create empty vaults.

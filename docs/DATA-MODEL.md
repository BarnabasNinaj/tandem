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
| `settings` | `TandemSettings` | Partners, currency, categories, auto-lock |
| `history` | `Record<monthKey, MonthlyRecord>` | Keys `YYYY-MM` |

### TandemSettings

| Field | Default (new vault) |
|-------|---------------------|
| `currencySymbol` | `€` |
| `currencyLocale` | `sk-SK` |
| `dateFormat` | always `DD/MM/YYYY` (enforced) |
| `emergencyTargetMonths` | `6` |
| `partnerAName` / `partnerBName` | `Partner A` / `Partner B` |
| `categories` | `DEFAULT_CATEGORIES` |
| `autoLockMinutes` | `30` |

### MonthlyRecord

Built by `buildMonthlyRecord` in `finance.ts` (never hand-roll `computed`).

**Inflows:** `partnerASalary`, `partnerBIncome`, `childSupport`, `otherInflows`

**Outflows:** `{ categoryId, categoryName, amount }[]`

**Allocations (this month’s transfers off the spending pool):**  
`emergencyReserve`, `travelFund`, `investments`

**Portfolio snapshot (balances at close):**  
`emergencyReserveBalance`, `travelFundBalance`, `externalInvestmentsBalance`, `liquidCashBalance`

**Computed (derived, stored for history):**

```
totalInflow = sum(inflows)
totalOutflow = sum(outflows)
discretionarySurplus = totalInflow − totalOutflow − sum(allocations)
personalAllowancePerPartner = discretionarySurplus / 2
```

All money values rounded with `round2`.

**Net worth (dashboard):** sum of portfolio snapshot balances (not a separate stored field).

**Savings rate:** `(totalInflow − totalOutflow) / totalInflow * 100` — allocations count as saved.

## Wizard draft

`WizardDraft` mirrors a month before close. Autosaved every 5s while the wizard is open as an encrypted blob in `localStorage` (`tandem.draft.enc`), using the vault salt + master password.

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

`buildDemoHistory()` seeds months `2026-09` and `2026-10` with synthetic data.

**C3A (2026-10-23):** `createInitialState()` defaults to **empty** `history`. Demo months only when `withDemoData: true` or via Settings → “Load 2 months of sample data” (`loadDemoData`, merges/overwrites those keys and pushes). Setup / empty-remote unlock create empty vaults.

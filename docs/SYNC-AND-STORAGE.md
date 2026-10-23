# Sync & browser storage

## GitHub vault API (`src/lib/github.ts`)

Uses Contents API:

`GET/PUT https://api.github.com/repos/{user}/{repo}/contents/tandem_data.json.enc`

| Function | Behavior |
|----------|----------|
| `fetchRemoteVault` | Returns `{ content, sha }` or `null` on 404 |
| `pushRemoteVault` | PUT with base64 body; optional `sha` for update |
| `testGitHubConnection` | GET repo metadata (setup “Test connection”) |

Retries: 3 attempts, exponential backoff from 400ms. **Does not retry** `GitHubConflictError` / `GitHubNotFoundError`.

Branch: `config.branch || 'main'`.

### Conflict model

Optimistic locking on Git blob SHA:

1. Client remembers `remoteSha` after pull/unlock/push.
2. Before push (when SHA known), re-fetches; mismatch → `GitHubConflictError`.
3. HTTP 409/422 also mapped to conflict.
4. UI (`ConflictDialog`): **Pull remote** (discard local pending) or **Force overwrite** (push pending with remote SHA).

There is **no automatic merge** of `history` months. Last writer wins on overwrite.

## Store sync actions (`tandem-store.ts`)

| Action | Effect |
|--------|--------|
| `completeSetup` | Save config; pull existing vault or create+push initial |
| `unlock` | Fetch (or session cache); decrypt; optional background refresh |
| `pull` | Remote → decrypt → replace state |
| `push` | Encrypt state → PUT; may set `conflict` |
| `saveMonth` | Write history key → push with `feat: track data …` |
| `changePassword` | Re-encrypt → push |
| `importJson` | Replace state → push |
| `loadDemoData` | Strip old samples, merge H1 2026 → push |
| `clearDemoData` | Remove sample month keys → push |

Quiet unlock (`boot` with session password): prefer `sessionStorage` vault cache, then refresh GitHub in background (network errors ignored).

## Commit message conventions (vault repo)

Used as GitHub commit messages on the **data** repo, not this app repo:

- `chore: initialize Tandem vault`
- `chore: update Tandem vault`
- `feat: track data YYYY-MM`
- `security: rotate master password`
- `chore: import JSON backup`
- `chore: load sample months (H1 2026)`
- `chore: remove sample months`
- `chore: update settings`
- force path appends ` (force overwrite)`

## Device invite (`device-invite.ts`)

Format: `tandem-device:` + base64url(JSON `{ v:1, u, r, p }`).

Setup: scan QR or paste → fills GitHub fields → partner enters **shared master password** separately.

## Wizard autosave

Every 5 seconds while open: encrypt draft with password + state salt → `tandem.draft.enc`. Cleared on successful `saveMonth` and on `lock`.

## Settings persistence nuance

- Household / category edits call `updateState` (memory only) until **Save & sync** (`push`).
- GitHub credential **Update** writes `localStorage` immediately; next sync uses new PAT.
- Leaving settings without Save & sync can lose in-memory settings on lock/refresh (session cache has last **pushed** ciphertext, not unsynced edits — after quiet unlock, background pull may also overwrite unsynced local edits). Prefer always syncing after edits.

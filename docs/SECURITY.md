# Security model

## Threat model (intended)

| Asset | Protection |
|-------|------------|
| Household finances (plaintext) | Only in browser memory while unlocked; never on GitHub in cleartext |
| Vault at rest on GitHub | AES-256-GCM; key from master password + PBKDF2 (100k, SHA-256) |
| Sync credentials | Fine-Grained PAT in browser `localStorage`; should be scoped to data repo Contents only |
| Master password | User-memorized; sessionStorage while unlocked; never in invite QR |

**GitHub can see:** encrypted blob, commit metadata, repo membership.  
**GitHub cannot decrypt** without the password (assuming password strength).

This is **zero-knowledge relative to GitHub**, not “immune to XSS on the app origin.”

## Trust boundaries

1. **App origin (Vercel / localhost)** — full trust while unlocked. XSS ⇒ PAT + password + vault.
2. **Data repo** — ciphertext + operational metadata. Must stay **private**.
3. **Device invite** — encodes PAT. Equivalent to handing someone write access to the vault file. Show briefly; don’t screenshot into chat.
4. **JSON export** — **plaintext** emergency backup. Offline only; delete after restore.

## Crypto parameters (`src/lib/crypto.ts`)

| Parameter | Value |
|-----------|--------|
| KDF | PBKDF2-HMAC-SHA-256 |
| Iterations | 100_000 |
| Cipher | AES-GCM 256-bit |
| IV | 12 random bytes per encrypt |
| Salt | 16 random bytes (hex), stable on state |

Wrong password / corrupt ciphertext → `Invalid master password or corrupted vault.`

Password change re-encrypts full state with new password and pushes (`security: rotate master password`). Salt is currently reused from existing state (rotation of salt is not implemented).

## Storage map

| Key | Store | Contents |
|-----|--------|----------|
| `tandem.github` | localStorage | username, repo, PAT |
| `tandem.theme` | localStorage | `light` \| `dark` |
| `tandem.draft.enc` | localStorage | Encrypted wizard draft |
| `tandem.sk` | sessionStorage | Master password |
| `tandem.unlocked` | sessionStorage | Flag |
| `tandem.vault.cache` | sessionStorage | Last encrypted vault + SHA |

`clearSessionSecrets()` on lock / failed auth (non-quiet). Lock also clears encrypted draft.

## Operational rules

- PAT: Fine-Grained, **Contents: Read and write**, single data repository, no unnecessary scopes.
- Master password: min 8 chars enforced in UI; prefer longer shared household secret.
- Partners share one password + one data repo.
- Rotate PAT if invite leaked; rotate password via Settings if password leaked.
- Do not commit `.env` with PATs (app doesn’t need build-time secrets).

## What agents must not do

- Log passwords, PATs, invite strings, or full decrypted state
- Move password into `localStorage` or URLs
- Weaken PBKDF2 iterations “for UX”
- Skip SHA conflict checks
- Recommend public data repos
- Add analytics SDKs that exfiltrate financial fields without an explicit product decision

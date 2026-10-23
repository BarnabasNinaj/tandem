# Tandem

Private, local-first household operating system and financial engine for couples.

Zero backend. Zero third-party databases. The app is a static PWA; the household vault is an AES-encrypted file synced to a **separate private GitHub data repo** via Fine-Grained PAT.

## Two repositories

| Repo | Role | Visibility |
|------|------|------------|
| **`tandem`** (this repo) | App source — UI, crypto, sync client | May be **public** (e.g. Vercel Hobby) |
| **Data repo** (e.g. `tandem-data`) | Vault file `tandem_data.json.enc` | **Must stay private** |

The data repo is the sync backend — not “a place that might contain secrets.” Making the **app** public does not expose finances. Making the **data** repo public is wrong for this architecture.

## Documentation

| Doc | Contents |
|-----|----------|
| [AGENTS.md](./AGENTS.md) | Entry point for AI / contributors |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design, phases, layering |
| [docs/DATA-MODEL.md](./docs/DATA-MODEL.md) | Vault schema, finance formulas |
| [docs/SECURITY.md](./docs/SECURITY.md) | Threat model, crypto, storage keys |
| [docs/SYNC-AND-STORAGE.md](./docs/SYNC-AND-STORAGE.md) | GitHub SHA locking, invites, drafts |
| [docs/PRODUCT.md](./docs/PRODUCT.md) | UX, visuals, shortcuts |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Vercel, PWA, Hobby plan notes |
| [docs/AUDIT.md](./docs/AUDIT.md) | Full audit findings |

Cursor rules: [`.cursor/rules/`](./.cursor/rules/).

**Docs policy:** behavior changes must update the matching docs (and rules) in the same change — see `.cursor/rules/docs-must-stay-current.mdc`.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS 4 + Zustand + Recharts
- Web Crypto (AES-256-GCM + PBKDF2)
- PWA (`vite-plugin-pwa`)
- GitHub Contents API

## Develop

```bash
npm install
npm run dev      # http://localhost:5280
npm run lint
npm test         # unit tests (finance, crypto, migrate, invite)
npm run build
```

## First-run setup

1. Create a **private** GitHub data repo (e.g. `tandem-data`) with a README.
2. Create a Fine-Grained PAT with **Contents: Read and write** on that repo only.
3. Open Tandem → manual setup (or scan a partner invite).
4. Set / enter the shared master password — it never leaves the browser; GitHub only stores ciphertext.

Partner devices: Settings → Add a device (QR embeds sync credentials, **not** the password).

## Shortcuts

- `Ctrl/Cmd + N` — End-of-Month wizard
- `Ctrl/Cmd + S` — save month / push vault

## Conventions

- UI dates: **DD/MM/YYYY**. Month keys: `YYYY-MM`.
- Default locale in new vaults: `sk-SK`, currency `€`.

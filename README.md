# Tandem

Private, local-first household operating system and financial engine for couples.

Zero backend. Zero third-party databases. Encrypted vault synced to your private GitHub repo via Fine-Grained PAT.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- Recharts
- Web Crypto (AES-256-GCM + PBKDF2)
- PWA (vite-plugin-pwa)

## Develop

```bash
npm install
npm run dev
```

## Build / Deploy

```bash
npm run build
```

Deploy the `dist/` folder to Vercel (static) or any static host. No server required.

## First-run setup

1. Create a **private** GitHub repo (e.g. `tandem`) with a README.
2. Create a Fine-Grained PAT with **Contents: Read and write** on that repo only.
3. Open Tandem and complete the onboarding wizard.
4. Unlock with your master password — the key never leaves the browser.

## Shortcuts

- `Ctrl/Cmd + N` — open End-of-Month wizard
- `Ctrl/Cmd + S` — save month / push vault

## Date format

All UI dates use **DD/MM/YYYY**. Internal month keys remain `YYYY-MM`.

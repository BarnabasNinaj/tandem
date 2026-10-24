# Deployment

## App (`tandem` repo)

Static site. Build output: `dist/`.

```bash
npm ci
npm run build
```

### Vercel

`vercel.json`:

- Framework: Vite
- `outputDirectory`: `dist`
- SPA rewrite: all routes → `/index.html`

No Vercel env vars are required for core function. Secrets are entered at runtime in the browser.

### PWA

`vite-plugin-pwa` with `registerType: 'autoUpdate'`, registered from `main.tsx` via `virtual:pwa-register` (`immediate: true`).

- Precache: hashed JS/CSS/fonts/icons only — **not** `index.html` (avoids serving a stale shell after deploy).
- Navigations: Workbox **NetworkFirst** (`tandem-html` cache, 3s timeout) so online loads get the current HTML → current hashed bundles.
- Stale chunk after deploy: `vite:preloadError` triggers one guarded reload.

Icons under `public/` (`pwa-192.png`, `pwa-512.png`, etc.). Logo/body fonts are self-hosted under `public/fonts/` (preloaded Fugaz One).

### Local

| Command | URL |
|---------|-----|
| `npm run dev` | `http://localhost:5280` (strictPort) |
| `npm run preview` | same port for `dist/` |

## Data repo (not deployed)

Create a **private** empty-ish GitHub repo (README ok). No Vercel project. Only Contents API writes `tandem_data.json.enc`.

## Vercel Hobby + Git author access

Hobby does **not** allow collaborators on **private** app repos. Symptoms: deploy blocked — commit author lacks contributing access.

**Decision (2026-10-23):** **`tandem` (app) is public** so production deploys from this repo are unblocked on Hobby. Keep **`tandem-data` (vault) private** — public app source does not expose household finances.

Other options (not chosen): Pro team, or only the Vercel owner pushes app commits.

Also ensure Git `user.email` is a **verified** email on the GitHub account linked to Vercel (Cursor/git email mismatch can look like a foreign author). After flipping visibility, push a commit (or Redeploy in Vercel) if the last deploy stayed blocked.

## What not to deploy

- Never point Vercel at the data repo as a “frontend.”
- Never bake PATs into build env “for convenience.”
- Never publish the data repo to fix Vercel — that confuses app hosting with vault privacy.

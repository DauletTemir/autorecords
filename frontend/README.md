# AutoRecords — frontend

Vehicle service history tracker for a garage or group of people sharing
vehicles (family, small repair shop, etc.). Users sign up, join or create a
group, add vehicles, and log service history — either by hand or by
uploading a photo of an invoice/work order for AI extraction.

## Stack

- React 19 + Vite 8
- Tailwind CSS 4
- React Router 7
- Supabase (auth, Postgres via `@supabase/supabase-js`, row-level security)
- Vitest for unit tests, Playwright for E2E

The frontend talks to Supabase directly for data (protected by RLS) and to
the backend only for operations that need a server-side secret: AI photo
analysis (Gemini) and the Google Sheets backup.

## Local development

```bash
cp .env.example .env   # fill in your Supabase project URL/anon key and the backend URL
npm install
npm run dev
```

The backend (`../backend`) needs to be running separately — see its own
`.env.example` and `npm run dev`.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — production build to `dist/`
- `npm run test` — Vitest unit tests
- `npm run test:e2e` — Playwright E2E tests (needs `.env.e2e`, see `.env.e2e.example`)
- `npm run lint` — Oxlint

## Deployment

Deployed on **Cloudflare Pages**, auto-deploying from GitHub on every push
to `main`. Cloudflare Pages project settings:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist` |

Required environment variables (set in the Cloudflare Pages dashboard, not
in code):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` — the deployed backend URL (e.g. `https://api.prodexperts.com`)

See the root [README](../README.md) for how the backend is deployed.

# AutoRecords

Vehicle service history tracker for groups (families, small repair shops)
with AI-assisted photo intake for service documents.

## Layout

This is a monorepo with three top-level pieces:

- [`frontend/`](frontend/README.md) — React + Vite app (Supabase-backed)
- `backend/` — Express + TypeScript API: AI photo analysis (Gemini) and
  the Google Sheets backup, both of which need server-side secrets the
  frontend must never hold
- [`docs/`](docs/BACKUP.md) — supplementary docs (currently just the
  Google Sheets backup setup guide)

Each of `frontend/` and `backend/` has its own `package.json`,
`.env.example`, and `npm run dev` — see `frontend/README.md` for the
frontend's local setup.

## Deployment

- **Frontend**: Cloudflare Pages, auto-deploying from GitHub on every push
  to `main`. Configuration details in [`frontend/README.md`](frontend/README.md#deployment).
- **Backend**: runs as a Node.js app under cPanel/Passenger on Namecheap
  shared hosting (Node 24.16.0). Deployed via GitHub Actions over SSH —
  see `.github/workflows/deploy-backend.yml` and `.cpanel.yml`.

CI runs on every push/PR to `main` via `.github/workflows/ci.yml`
(build + test for both `frontend/` and `backend/`).

## License

MIT — see [LICENSE](LICENSE).

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
  shared hosting (Node 24). The shared hosting firewall blocks SSH
  connections from GitHub Actions' dynamic runner IPs, so there's no CI-driven
  deploy — but the cPanel-side deploy itself is a single click. After
  pushing to `main`:
  1. In cPanel → **Git Version Control**, open the `autorecords` repo and
     click **Update from Remote** to pull the latest `main`.
  2. Click **Deploy HEAD Commit**. This runs `.cpanel.yml`'s task list,
     which installs dependencies (including dev, since `tsc` needs to run),
     rebuilds `backend/dist/`, and touches `tmp/restart.txt` to restart
     Passenger — the same three steps that used to be run by hand over SSH.

  If the automated deploy script itself fails (check
  `backend/stderr.log` and the cPanel deploy log), see
  [`docs/BACKUP.md`](docs/BACKUP.md#troubleshooting) for the manual
  fallback: activate the app's nodevenv, then run `npm ci --include=dev`
  and `npm run build` by hand over SSH/Terminal.

CI runs on every push/PR to `main` via `.github/workflows/ci.yml`
(build + test for both `frontend/` and `backend/`).

## License

MIT — see [LICENSE](LICENSE).

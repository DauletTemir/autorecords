# Google Sheets backup

One-way mirror of a single group's data (vehicles + service history) into a
Google Sheet, triggered from the backend right after every save. Supabase
remains the source of truth — the sheet is read-only reference/backup, never
written back into the app.

Scoped to exactly one `org_id` via `BACKUP_ORG_ID`. Other users' data is never
written to this sheet, regardless of how many groups exist in the app.

## One-time setup

1. **Google Cloud Console** → create a Service Account. It does not need to
   be in the same project as the Gemini API key — a separate project works
   fine as long as the steps below are done in that same project.
   - IAM & Admin → Service Accounts → Create Service Account
   - Keys tab → Add Key → Create new key → JSON, download it
2. Enable, in that same project, the two APIs the service account needs:
   - Google Sheets API (`console.cloud.google.com/apis/library/sheets.googleapis.com?project=<PROJECT_ID>`)
   - Google Drive API (`console.cloud.google.com/apis/library/drive.googleapis.com?project=<PROJECT_ID>`)
3. Create (or reuse) a Google Sheet. You don't need to pre-create the
   `Vehicles`/`ServiceEntries` tabs — `sheetsBackup.ts` creates any missing
   ones automatically on the first successful backup call.
4. Share that Sheet with the service account's email
   (`client_email` field in the downloaded JSON, looks like
   `...@<project-id>.iam.gserviceaccount.com`) with Editor access.
5. Set in `backend/.env`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — the `client_email` field from the JSON
   - The private key, via **one** of these two variables:
     - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_B64` (**preferred**) — base64-encode
       the `private_key` field from the JSON and set the result here:
       ```bash
       # macOS/Linux
       echo -n '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n' | base64
       # or, working from the downloaded JSON directly:
       python3 -c "import json,base64; print(base64.b64encode(json.load(open('key.json'))['private_key'].encode()).decode())"
       ```
       This exists specifically for **cPanel/Passenger hosting**: a raw
       multiline PEM value (or one relying on literal `\n` escapes) reliably
       gets mangled by cPanel's shell-based startup scripts, which breaks
       the app on deploy in a way that's easy to miss until the backup
       feature silently stops working. A single-line base64 string survives
       that untouched, and the backend decodes it back to the real PEM at
       startup — prefer this variable over the one below whenever deploying
       to cPanel.
     - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (legacy fallback, used only when
       the `_B64` variable above is unset) — the `private_key` field from the
       JSON, kept as one line with literal `\n` sequences (that's how it
       comes out of the JSON file already — paste it as-is inside quotes).
       Fine for local `.env` files, where multiline values work without
       issue; not recommended on cPanel.
   - `BACKUP_SPREADSHEET_ID` — the ID from the sheet's URL
     (`docs.google.com/spreadsheets/d/<THIS_PART>/edit`)
   - `BACKUP_ORG_ID` — the UUID of the one group whose data should be backed up

If `GOOGLE_SERVICE_ACCOUNT_EMAIL`, a private key (either variable), 
`BACKUP_SPREADSHEET_ID`, or `BACKUP_ORG_ID` is missing, `POST /api/backup`
becomes a no-op (`{ skipped: true }`) — nothing breaks, the feature is just
off.

## Troubleshooting

- **Backup silently returns `{ skipped: true }` even though all four env
  vars show correct values in cPanel's Node.js App UI** — this almost
  always means the *running* process doesn't actually have those values,
  even if the UI does. Two distinct causes, check in this order:
  1. **`backend/dist/` is stale** — Passenger runs whatever's already
     compiled in `dist/`, not your source. If a `git pull` landed new
     source but `npm run build` never re-ran (e.g. an interrupted or
     partial manual deploy from before `.cpanel.yml` automated this),
     the old compiled JS keeps running regardless of what env vars are
     set or how many times you click Restart. Confirm with:
     ```bash
     grep -c GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_B64 backend/dist/services/sheetsBackup.js
     ```
     A `0` means the deployed build predates this variable's support —
     redeploy (see below).
  2. **The running process predates your env var change** — Passenger
     injects env vars only at process spawn time, not per-request or on
     a config save. Clicking the cPanel UI's "Restart" touches a
     `restart.txt` file that Passenger polls on a throttled schedule, and
     that poll can be missed. A **Stop App, wait a few seconds, then
     Start App** cycle forces an actual respawn more reliably than
     Restart. To confirm which process is actually serving traffic and
     what it sees:
     ```bash
     curl -s https://<your-backend-domain>/health -o /dev/null && \
       ps -u <cpanel-username> -f | grep -iE "node|lsnode|passenger" | grep -v grep
     # then, with the PID from that output, immediately:
     tr '\0' '\n' < /proc/<PID>/environ | grep -E '^(BACKUP_ORG_ID|BACKUP_SPREADSHEET_ID|GOOGLE_SERVICE_ACCOUNT_EMAIL|GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_B64)=' | cut -d= -f1
     ```
     (Only names are printed, never values — safe to paste into a chat
     or issue when asking for help.) The process dies quickly when idle
     on shared hosting, so run both commands as a single `&&` chain, not
     as separate steps — otherwise the PID you looked up will already be
     gone by the time you check its environment.

     **If Stop App → Start App still doesn't change the PID** (confirmed
     to happen on this host — the UI reports success but the same PID
     keeps serving traffic with the old in-memory code), the only
     reliable fix is to kill that PID directly from Terminal so Passenger
     is forced to spawn a genuinely new process:
     ```bash
     kill <PID>
     sleep 5
     curl -s https://<your-backend-domain>/health -o /dev/null -w '%{http_code}\n'
     ps -u <cpanel-username> -f | grep -iE "node|lsnode|passenger" | grep -v grep
     ```
     Confirm the PID in the last line differs from the one you killed
     before treating the deploy as complete — a matching PID means
     Passenger respawned it from a stale worker pool rather than starting
     fresh, and you're still running old code.
- **Deploying the backend without `.cpanel.yml`'s automated build** — the
  primary path is `git pull` + **Deploy HEAD Commit** in cPanel's Git
  Version Control (see the root [README](../README.md#deployment)). If
  that automated script itself fails, here's the manual fallback over
  SSH/Terminal:
  ```bash
  source /home/<cpanel-username>/nodevenv/repositories/autorecords/backend/<node-version>/bin/activate
  cd /home/<cpanel-username>/repositories/autorecords/backend
  npm ci --include=dev   # --include=dev is required: NODE_ENV=production
                          # in this environment makes plain `npm ci` skip
                          # devDependencies, which is where `typescript`
                          # (and therefore `tsc`) lives
  npm run build
  touch tmp/restart.txt
  ```
- **`error:1E08010C:DECODER routines::unsupported`, `ERR_OSSL_UNSUPPORTED`,
  or JWT signing failures on cPanel specifically**, when the same
  credentials work fine locally, usually mean the multiline
  `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` value got corrupted by cPanel's
  startup scripts (stripped newlines, escaped quotes, truncated at a
  blank line, etc.) — switch to `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_B64`,
  which isn't multiline and isn't affected by this.
- **`ERROR: The caller does not have permission`** when calling the Sheets
  API directly means the sheet isn't shared with the service account's exact
  email, or you're looking at a different Google account/project than the
  one the service account actually lives in. If you have multiple Google
  Cloud projects with similar names, double check the project ID in the
  URL bar, not just the display name — it's easy to enable an API in the
  wrong project by mistake.
- **`Google Sheets API has not been used in project ... or it is disabled`**
  means step 2 above wasn't done for the project the service account's
  `client_email` belongs to (the domain after `@` in that email is the
  project ID).
- To sanity-check credentials without going through the app, run a small
  script that constructs a `google.auth.JWT` from the env vars and calls
  `sheets.spreadsheets.get({ spreadsheetId })` — a permission or API-disabled
  error surfaces immediately and clearly.

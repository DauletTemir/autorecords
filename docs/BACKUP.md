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

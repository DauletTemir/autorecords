# Google Sheets backup

One-way mirror of a single group's data (vehicles + service history) into a
Google Sheet, triggered from the backend right after every save. Supabase
remains the source of truth — the sheet is read-only reference/backup, never
written back into the app.

Scoped to exactly one `org_id` via `BACKUP_ORG_ID`. Other users' data is never
written to this sheet, regardless of how many groups exist in the app.

## One-time setup

1. **Google Cloud Console** → create a Service Account in the same project
   used for the Gemini API key.
   - IAM & Admin → Service Accounts → Create Service Account
   - Keys tab → Add Key → Create new key → JSON, download it
2. Enable two APIs for that project:
   - Google Sheets API
   - Google Drive API
3. Create (or reuse) a Google Sheet with two tabs named exactly `Vehicles`
   and `ServiceEntries`.
4. Share that Sheet with the service account's email
   (`...@<project>.iam.gserviceaccount.com`, found in the downloaded JSON)
   with Editor access.
5. Set in `backend/.env`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — the `client_email` field from the JSON
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — the `private_key` field from the
     JSON, kept as one line with literal `\n` sequences (that's how it comes
     out of the JSON file already — paste it as-is inside quotes)
   - `BACKUP_SPREADSHEET_ID` — the ID from the sheet's URL
     (`docs.google.com/spreadsheets/d/<THIS_PART>/edit`)
   - `BACKUP_ORG_ID` — the UUID of the one group whose data should be backed up

If any of these four variables is missing, `POST /api/backup` becomes a no-op
(`{ skipped: true }`) — nothing breaks, the feature is just off.

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
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — the `private_key` field from the
     JSON, kept as one line with literal `\n` sequences (that's how it comes
     out of the JSON file already — paste it as-is inside quotes)
   - `BACKUP_SPREADSHEET_ID` — the ID from the sheet's URL
     (`docs.google.com/spreadsheets/d/<THIS_PART>/edit`)
   - `BACKUP_ORG_ID` — the UUID of the one group whose data should be backed up

If any of these four variables is missing, `POST /api/backup` becomes a no-op
(`{ skipped: true }`) — nothing breaks, the feature is just off.

## Troubleshooting

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

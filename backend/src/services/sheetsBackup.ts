import { google } from "googleapis";
import { env } from "../config/env.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

const VEHICLES_RANGE = "Vehicles!A1:F1000";
const ENTRIES_RANGE = "ServiceEntries!A1:H1000";

function isConfigured(): boolean {
  return Boolean(
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      env.BACKUP_SPREADSHEET_ID &&
      env.BACKUP_ORG_ID,
  );
}

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

/**
 * One-way backup: only ever mirrors BACKUP_ORG_ID's data into Sheets.
 * Never writes data belonging to other users/groups.
 */
export async function backupOrgToSheets(orgId: string): Promise<{ skipped: boolean }> {
  if (!isConfigured()) return { skipped: true };
  if (orgId !== env.BACKUP_ORG_ID) return { skipped: true };

  const sheets = getSheetsClient();
  const spreadsheetId = env.BACKUP_SPREADSHEET_ID!;

  const { data: vehicles, error: vehiclesError } = await supabaseAdmin
    .from("vehicles")
    .select("vin, brand, model, year, plate, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  if (vehiclesError) throw vehiclesError;

  const { data: entries, error: entriesError } = await supabaseAdmin
    .from("service_entries")
    .select("vehicle_id, date, service_type, description, mileage, cost, comment, vehicles!inner(vin, org_id)")
    .eq("vehicles.org_id", orgId)
    .order("date", { ascending: true });
  if (entriesError) throw entriesError;

  const vehicleRows = [
    ["VIN", "Brand", "Model", "Year", "Plate", "Created At"],
    ...(vehicles ?? []).map((v) => [v.vin, v.brand, v.model, v.year, v.plate, v.created_at]),
  ];

  const entryRows = [
    ["VIN", "Date", "Service type", "Description", "Mileage", "Cost", "Comment"],
    ...(entries ?? []).map((e) => {
      const vehicle = Array.isArray(e.vehicles) ? e.vehicles[0] : e.vehicles;
      return [vehicle?.vin ?? "", e.date, e.service_type, e.description, e.mileage, e.cost, e.comment];
    }),
  ];

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: VEHICLES_RANGE });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Vehicles!A1",
    valueInputOption: "RAW",
    requestBody: { values: vehicleRows },
  });

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: ENTRIES_RANGE });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "ServiceEntries!A1",
    valueInputOption: "RAW",
    requestBody: { values: entryRows },
  });

  return { skipped: false };
}

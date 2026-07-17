import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3001"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  FRONTEND_ORIGIN: z.string().url(),
  // Google Sheets backup — restricted to a single org (see docs/BACKUP.md)
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),
  BACKUP_SPREADSHEET_ID: z.string().optional(),
  BACKUP_ORG_ID: z.string().uuid().optional(),
});

export const env = envSchema.parse(process.env);

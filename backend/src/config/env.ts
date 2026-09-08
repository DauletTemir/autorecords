import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3001"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  // gemini-3.5-flash-lite gets 500 RPD on the free tier vs. 20 RPD for
  // gemini-3.5-flash (confirmed via AI Studio's rate-limit dashboard) —
  // configurable so the model can be swapped without a code change.
  GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite"),
  FRONTEND_ORIGIN: z.string().url(),
  // Google Sheets backup — restricted to a single org (see docs/BACKUP.md)
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),
  // Preferred over the raw multiline var above — see docs/BACKUP.md.
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_B64: z.string().optional(),
  BACKUP_SPREADSHEET_ID: z.string().optional(),
  BACKUP_ORG_ID: z.string().uuid().optional(),
});

export const env = envSchema.parse(process.env);

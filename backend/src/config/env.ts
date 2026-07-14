import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3001"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  FRONTEND_ORIGIN: z.string().url(),
});

export const env = envSchema.parse(process.env);

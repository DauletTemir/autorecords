import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("E2E tests require VITE_SUPABASE_URL and E2E_SUPABASE_SERVICE_ROLE_KEY env vars");
}

export const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let counter = 0;

export function uniqueEmail(prefix: string): string {
  counter += 1;
  // Supabase rejects several reserved test TLDs (.test, .example, .invalid)
  // as invalid addresses, so a real-looking domain is required here.
  return `autorecords.e2e.${prefix}.${Date.now()}.${counter}@gmail.com`;
}

export async function createConfirmedUser(email: string, password: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return data.user.id;
}

export async function deleteUser(userId: string | undefined): Promise<void> {
  if (!userId) return;
  await admin.auth.admin.deleteUser(userId).catch(() => {});
}

export async function deleteOrgsCreatedBy(userId: string | undefined): Promise<void> {
  if (!userId) return;
  await admin.from("organizations").delete().eq("created_by", userId);
}

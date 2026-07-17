import { supabase } from "./supabaseClient";

const API_URL = import.meta.env.VITE_API_URL;

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
}

export async function analyzePhoto(file, lang, knownVins) {
  const headers = await authHeader();
  const form = new FormData();
  form.append("photo", file);
  form.append("lang", lang);
  form.append("knownVins", JSON.stringify(knownVins));

  const res = await fetch(`${API_URL}/api/analyze-photo`, {
    method: "POST",
    headers,
    body: form,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// Fire-and-forget: backup failures must never block the user's save.
export async function triggerBackup(orgId) {
  try {
    const headers = await authHeader();
    await fetch(`${API_URL}/api/backup`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
  } catch {
    // Backup is best-effort; Supabase remains the source of truth.
  }
}

export async function inviteMember(groupId, email) {
  const headers = await authHeader();
  const res = await fetch(`${API_URL}/api/groups/${groupId}/invite`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

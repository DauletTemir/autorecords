import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const LAST_ACTIVE_KEY = "autorecords-last-active";
const INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Supabase's refresh token keeps a session alive indefinitely as long as
// the app is opened at least once within its own (much longer) expiry
// window — there's no first-party "log out after N days idle" setting.
// This tracks the user's own last-activity timestamp in localStorage and
// signs them out once it's stale, independent of whether the refresh
// token itself would still be valid.
function getLastActive() {
  const raw = localStorage.getItem(LAST_ACTIVE_KEY);
  if (raw === null) return null; // Number(null) is 0, not NaN — must check before converting
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function touchLastActive() {
  localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
}

function isInactiveTooLong() {
  const lastActive = getLastActive();
  if (lastActive === null) return false; // first visit ever — nothing to expire yet
  return Date.now() - lastActive > INACTIVITY_LIMIT_MS;
}

export function useAuth() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();

      if (data.session && isInactiveTooLong()) {
        await supabase.auth.signOut();
        setSession(null);
        return;
      }

      if (data.session) touchLastActive();
      setSession(data.session);
    }
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) touchLastActive();
      setSession(newSession);
    });

    // Real user activity resets the inactivity clock while the tab is
    // open — otherwise someone actively using the app for a long
    // uninterrupted session could still get logged out mid-use.
    const resetTimer = () => touchLastActive();
    window.addEventListener("pointerdown", resetTimer);
    window.addEventListener("keydown", resetTimer);

    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("pointerdown", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading: session === undefined,
  };
}

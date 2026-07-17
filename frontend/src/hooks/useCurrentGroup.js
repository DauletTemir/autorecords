import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./useAuth";

// The user's default group is created atomically by a Postgres trigger on
// auth.users at signup time (see handle_new_user() in schema.sql) — this
// hook only ever reads it, avoiding the race condition where two pages
// mounting at once used to each create their own group client-side.
export function useCurrentGroup() {
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setGroup(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    supabase
      .from("org_members")
      .select("org_id, organizations(id, name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setGroup(data?.organizations ?? null);
        setLoading(false);
      });
  }, [user]);

  return { group, loading };
}

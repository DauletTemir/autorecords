import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { inviteMember } from "../lib/api";

export function useGroupMembers(orgId) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("org_members")
      .select("user_id, role")
      .eq("org_id", orgId);
    setMembers(data ?? []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const invite = useCallback(async (email) => {
    await inviteMember(orgId, email);
  }, [orgId]);

  return { members, loading, invite, reload };
}

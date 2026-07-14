import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./useAuth";

async function createDefaultGroup(userId) {
  const { data: group, error: groupError } = await supabase
    .from("organizations")
    .insert({ name: "Гараж", created_by: userId })
    .select()
    .single();

  if (groupError || !group) throw groupError;

  const { error: memberError } = await supabase
    .from("org_members")
    .insert({ user_id: userId, org_id: group.id, role: "owner" });

  if (memberError) throw memberError;
  return group;
}

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
      .then(async ({ data }) => {
        if (data?.organizations) {
          setGroup(data.organizations);
          setLoading(false);
          return;
        }
        // First login after email confirmation: no group yet, create one.
        const newGroup = await createDefaultGroup(user.id);
        setGroup(newGroup);
        setLoading(false);
      });
  }, [user]);

  return { group, loading };
}

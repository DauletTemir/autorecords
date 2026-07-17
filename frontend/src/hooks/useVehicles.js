import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { triggerBackup } from "../lib/api";

export function useVehicles(orgId) {
  const [vehicles, setVehicles] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data: vehicleRows } = await supabase
      .from("vehicles")
      .select("id, vin, brand, model, year, plate")
      .eq("org_id", orgId);

    const { data: entryRows } = await supabase
      .from("service_entries")
      .select("id, vehicle_id, date, service_type, description, mileage, cost, comment")
      .in("vehicle_id", (vehicleRows ?? []).map((v) => v.id));

    const withHistory = (vehicleRows ?? []).map((v) => ({
      ...v,
      history: (entryRows ?? []).filter((e) => e.vehicle_id === v.id),
    }));

    setVehicles(withHistory);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addVehicle = useCallback(async (info) => {
    const { data, error } = await supabase
      .from("vehicles")
      .insert({ org_id: orgId, vin: info.vin, brand: info.brand, model: info.model, year: info.year, plate: info.plate })
      .select()
      .single();
    if (error) throw error;
    await reload();
    triggerBackup(orgId);
    return data;
  }, [orgId, reload]);

  const addEntry = useCallback(async (vehicleId, entry) => {
    const { error } = await supabase.from("service_entries").insert({
      vehicle_id: vehicleId,
      ...entry,
      cost: entry.cost === "" ? null : entry.cost,
    });
    if (error) throw error;
    await reload();
    triggerBackup(orgId);
  }, [orgId, reload]);

  const deleteVehicle = useCallback(async (vehicleId) => {
    const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId);
    if (error) throw error;
    await reload();
    triggerBackup(orgId);
  }, [orgId, reload]);

  return { vehicles, loading, addVehicle, addEntry, deleteVehicle, reload };
}

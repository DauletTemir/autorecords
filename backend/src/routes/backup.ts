import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../services/supabaseAdmin.js";
import { backupOrgToSheets } from "../services/sheetsBackup.js";

const bodySchema = z.object({ orgId: z.string().uuid() });

export const backupRouter = Router();

backupRouter.post("/backup", requireAuth, async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "orgId is required" });
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("org_members")
    .select("user_id")
    .eq("org_id", parsed.data.orgId)
    .eq("user_id", req.userId)
    .maybeSingle();

  if (membershipError || !membership) {
    return res.status(403).json({ error: "You are not a member of this group" });
  }

  try {
    const result = await backupOrgToSheets(parsed.data.orgId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: "Backup failed", detail: message });
  }
});

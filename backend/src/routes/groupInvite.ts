import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { inviteLimiter } from "../middleware/rateLimit.js";
import { supabaseAdmin } from "../services/supabaseAdmin.js";

const bodySchema = z.object({ email: z.string().email() });

export const groupInviteRouter = Router();

groupInviteRouter.post(
  "/groups/:id/invite",
  requireAuth,
  inviteLimiter,
  async (req, res) => {
    const groupId = req.params.id;
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("org_members")
      .select("user_id")
      .eq("org_id", groupId)
      .eq("user_id", req.userId)
      .maybeSingle();

    if (membershipError || !membership) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      parsed.data.email,
      { data: { invited_org_id: groupId } },
    );

    if (inviteError) {
      return res.status(502).json({ error: "Failed to send invitation", detail: inviteError.message });
    }

    res.json({ ok: true });
  },
);

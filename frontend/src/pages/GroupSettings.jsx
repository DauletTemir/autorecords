import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../theme";
import { T } from "../i18n/translations";
import { useCurrentGroup } from "../hooks/useCurrentGroup";
import { useGroupMembers } from "../hooks/useGroupMembers";
import { supabase } from "../lib/supabaseClient";
import { Btn, Field, Input, Label } from "../components/ui";

const t = (k) => T.ru[k] || k;

export default function GroupSettings() {
  const navigate = useNavigate();
  const { group } = useCurrentGroup();
  const { members, invite, reload } = useGroupMembers(group?.id);
  const [name, setName] = useState(group?.name ?? "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [status, setStatus] = useState(null);

  const saveName = async () => {
    if (!group) return;
    await supabase.from("organizations").update({ name }).eq("id", group.id);
    setStatus({ msg: t("save"), kind: "ok" });
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    try {
      await invite(inviteEmail);
      setInviteEmail("");
      setStatus({ msg: t("inviteSent"), kind: "ok" });
      await reload();
    } catch (err) {
      setStatus({ msg: err.message, kind: "warn" });
    }
  };

  return (
    <div className="font-body min-h-screen px-4 sm:px-8 py-6 max-w-2xl mx-auto" style={{ background: C.pageBg, color: C.headingText }}>
      <button onClick={() => navigate("/app")} className="font-display uppercase font-semibold text-sm mb-4" style={{ color: C.bodyText, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        {t("back")}
      </button>

      <h1 className="font-display font-bold text-2xl mb-6" style={{ color: C.headingText }}>{t("groupSettings")}</h1>

      <section className="p-5 mb-5" style={{ background: C.card, borderRadius: 12 }}>
        <Field label={t("groupName")}>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Btn onClick={saveName}>{t("save")}</Btn>
          </div>
        </Field>
      </section>

      <section className="p-5 mb-5" style={{ background: C.card, borderRadius: 12 }}>
        <Label>{t("members")}</Label>
        <ul className="mt-3 text-sm">
          {members.map((m) => (
            <li key={m.user_id} className="py-1" style={{ color: C.bodyText }}>{m.user_id}</li>
          ))}
        </ul>

        <form onSubmit={sendInvite} className="mt-4">
          <Field label={t("inviteByEmail")}>
            <div className="flex gap-2">
              <Input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              <Btn type="submit">{t("invite")}</Btn>
            </div>
          </Field>
        </form>

        {status && (
          <div className="text-sm mt-2" style={{ color: status.kind === "warn" ? C.danger : C.ok }}>{status.msg}</div>
        )}
      </section>
    </div>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { C } from "../theme";
import { T } from "../i18n/translations";
import { Btn, Field, Input } from "../components/ui";

const t = (k) => T.ru[k] || k;

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setBusy(false);
      return setError(signUpError.message);
    }

    const userId = data.user?.id;
    if (userId) {
      const { data: group, error: groupError } = await supabase
        .from("organizations")
        .insert({ name: "Гараж" })
        .select()
        .single();

      if (!groupError && group) {
        await supabase.from("org_members").insert({ user_id: userId, org_id: group.id, role: "owner" });
      }
    }

    setBusy(false);
    navigate("/app");
  };

  return (
    <div className="font-body min-h-screen flex items-center justify-center px-4" style={{ background: C.pageBg }}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm p-6" style={{ background: "#fff", borderRadius: 12 }}>
        <div className="font-display font-bold text-2xl mb-5" style={{ color: C.headingText }}>{t("signup")}</div>
        <Field label={t("email")}>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t("password")}>
          <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <div className="text-sm mb-3" style={{ color: C.danger }}>{error}</div>}
        <Btn type="submit" disabled={busy} style={{ width: "100%" }}>{t("signup")}</Btn>
        <div className="mt-4 text-sm">
          {t("alreadyHaveAccount")} <Link to="/login" style={{ color: C.accent }}>{t("login")}</Link>
        </div>
      </form>
    </div>
  );
}

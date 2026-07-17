import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { C } from "../theme";
import { T } from "../i18n/translations";
import { Btn, Field, Input } from "../components/ui";
import GoogleAuthButton from "../components/GoogleAuthButton";

const t = (k) => T.ru[k] || k;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    navigate("/app");
  };

  return (
    <div className="font-body min-h-screen flex items-center justify-center px-4" style={{ background: C.pageBg }}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm p-6" style={{ background: "#fff", borderRadius: 12 }}>
        <div className="font-display font-bold text-2xl mb-5" style={{ color: C.headingText }}>{t("login")}</div>
        <Field label={t("email")}>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t("password")}>
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <div className="text-sm mb-3" style={{ color: C.danger }}>{error}</div>}
        <Btn type="submit" disabled={busy} style={{ width: "100%" }}>{t("login")}</Btn>

        <div className="flex items-center gap-3 my-4">
          <div style={{ flex: 1, height: 1, background: C.line }} />
          <span className="text-xs" style={{ color: C.bodyText }}>{t("orDivider")}</span>
          <div style={{ flex: 1, height: 1, background: C.line }} />
        </div>
        <GoogleAuthButton />

        <div className="mt-4 text-sm flex justify-between">
          <Link to="/reset-password" style={{ color: C.bodyText }}>{t("forgotPassword")}</Link>
          <span>
            {t("dontHaveAccount")} <Link to="/signup" style={{ color: C.accent }}>{t("signup")}</Link>
          </span>
        </div>
      </form>
    </div>
  );
}

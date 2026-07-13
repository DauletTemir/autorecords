import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { C } from "../theme";
import { T } from "../i18n/translations";
import { Btn, Field, Input } from "../components/ui";

const t = (k) => T.ru[k] || k;

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setSent(true);
  };

  return (
    <div className="font-body min-h-screen flex items-center justify-center px-4" style={{ background: C.pageBg }}>
      <div className="w-full max-w-sm p-6" style={{ background: "#fff", borderRadius: 12 }}>
        <div className="font-display font-bold text-2xl mb-5" style={{ color: C.headingText }}>{t("resetPassword")}</div>
        {sent ? (
          <div className="text-sm" style={{ color: C.ok }}>{t("resetPasswordSent")}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Field label={t("email")}>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            {error && <div className="text-sm mb-3" style={{ color: C.danger }}>{error}</div>}
            <Btn type="submit" disabled={busy} style={{ width: "100%" }}>{t("resetPassword")}</Btn>
          </form>
        )}
        <div className="mt-4 text-sm">
          <Link to="/login" style={{ color: C.accent }}>{t("login")}</Link>
        </div>
      </div>
    </div>
  );
}

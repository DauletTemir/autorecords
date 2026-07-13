import { Link } from "react-router-dom";
import { C } from "../theme";
import { T } from "../i18n/translations";

const t = (k) => T.ru[k] || k;

const FEATURES = [
  { key: "featureAi", chip: C.accent },
  { key: "featureHistory", chip: C.chipOchre },
  { key: "featureGroup", chip: C.chipBlue },
  { key: "featurePdf", chip: C.chipGreen },
];

export default function Landing() {
  return (
    <div className="font-body min-h-screen" style={{ background: C.pageBg, color: C.bodyText }}>
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="font-display font-bold text-xl" style={{ color: C.headingText }}>
          AutoRecords
        </div>
        <div className="hidden sm:flex items-center gap-6 font-body text-sm" style={{ color: C.bodyText }}>
          <a href="#features">{t("navFeatures")}</a>
          <a href="#pricing">{t("navPricing")}</a>
          <Link to="/login">{t("navLogin")}</Link>
        </div>
        <Link
          to="/signup"
          className="font-display uppercase font-semibold text-sm"
          style={{
            background: C.accent, color: "#fff", padding: "9px 18px",
            borderRadius: 999, letterSpacing: "0.06em",
          }}
        >
          {t("ctaStart")}
        </Link>
      </nav>

      <section className="grid md:grid-cols-2 gap-10 items-center px-6 sm:px-10 py-16 max-w-6xl mx-auto">
        <div>
          <h1 className="font-display font-bold" style={{ fontSize: 44, lineHeight: 1.1, color: C.headingText }}>
            {t("landingTitle")}
          </h1>
          <p className="mt-4 text-lg">{t("landingSubtitle")}</p>
          <div className="mt-8 flex gap-3">
            <Link
              to="/signup"
              className="font-display uppercase font-semibold"
              style={{ background: C.accent, color: "#fff", padding: "12px 24px", borderRadius: 999, letterSpacing: "0.06em" }}
            >
              {t("ctaStart")}
            </Link>
            <Link
              to="/login"
              className="font-display uppercase font-semibold"
              style={{ background: "transparent", color: C.headingText, border: `1.5px solid ${C.headingText}`, padding: "12px 24px", borderRadius: 999, letterSpacing: "0.06em" }}
            >
              {t("navLogin")}
            </Link>
          </div>
        </div>
        <div
          aria-hidden
          style={{
            height: 320, borderRadius: 16,
            background: `repeating-linear-gradient(-45deg, ${C.featureBg} 0 18px, ${C.accent}22 18px 36px)`,
          }}
        />
      </section>

      <section id="features" className="py-16" style={{ background: C.featureBg }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-10">
          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map(({ key, chip }) => (
              <div key={key} className="p-6" style={{ background: "#fff", borderRadius: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: chip }} />
                <div className="font-display font-bold mt-4 text-lg" style={{ color: C.headingText }}>
                  {t(`${key}Title`)}
                </div>
                <p className="mt-1 text-sm">{t(`${key}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 text-center" style={{ background: C.accentDark }}>
        <h2 className="font-display font-bold text-3xl" style={{ color: "#fff" }}>
          {t("footerCtaTitle")}
        </h2>
        <Link
          to="/signup"
          className="inline-block mt-6 font-display uppercase font-semibold"
          style={{ background: "#fff", color: C.accentDark, padding: "12px 28px", borderRadius: 999, letterSpacing: "0.06em" }}
        >
          {t("ctaStart")}
        </Link>
      </section>
    </div>
  );
}

import { C } from "../theme";
import { useLang } from "../i18n/LangContext";
import { LANGUAGES, LANGUAGE_LABELS } from "../i18n/translations";

export default function LanguageSwitcher({ style }) {
  const { lang, setLang } = useLang();

  return (
    <div className="flex gap-1" style={style}>
      {LANGUAGES.map((code) => {
        const active = code === lang;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            className="font-display uppercase font-semibold"
            style={{
              fontSize: 12, letterSpacing: "0.06em", padding: "5px 10px", borderRadius: 999,
              cursor: "pointer",
              background: active ? C.headingText : "transparent",
              color: active ? "#fff" : C.headingText,
              border: `1.5px solid ${C.headingText}`,
            }}
          >
            {LANGUAGE_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}

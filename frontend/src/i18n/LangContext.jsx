import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { T, LANGUAGES } from "./translations";

const STORAGE_KEY = "autorecords-lang";
const DEFAULT_LANG = "ru";

function readStoredLang() {
  if (typeof window === "undefined") return DEFAULT_LANG;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.includes(stored) ? stored : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);

  const setLang = useCallback((next) => {
    if (!LANGUAGES.includes(next)) return;
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode, etc.) — language just won't persist.
    }
  }, []);

  const t = useCallback((key) => T[lang]?.[key] ?? T[DEFAULT_LANG][key] ?? key, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within a LangProvider");
  return ctx;
}

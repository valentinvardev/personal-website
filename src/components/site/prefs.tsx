"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { CONTENT, type Content, type Lang } from "~/lib/content";

type Theme = "light" | "dark";

interface Prefs {
  theme: Theme;
  setTheme: (t: Theme) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Content;
}

const PrefsContext = createContext<Prefs | null>(null);

/* Auto: claro de 7 a 19 h, oscuro de noche — igual que el diseño original. */
function autoTheme(): Theme {
  const h = new Date().getHours();
  return h >= 7 && h < 19 ? "light" : "dark";
}

function autoLang(): Lang {
  return navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
}

/* Script inline para <head>: aplica el tema antes de la hidratación (sin flash). */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("vv-theme");var h=new Date().getHours();var t=(s==="light"||s==="dark")?s:(h>=7&&h<19?"light":"dark");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export function PrefsProvider({ children }: { children: ReactNode }) {
  // SSR renderiza siempre light/es; en el primer efecto se sincroniza con la
  // preferencia real del visitante (localStorage o auto).
  const [theme, setThemeState] = useState<Theme>("light");
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const savedTheme = localStorage.getItem("vv-theme");
    setThemeState(savedTheme === "light" || savedTheme === "dark" ? savedTheme : autoTheme());
    const savedLang = localStorage.getItem("vv-lang");
    setLangState(savedLang === "es" || savedLang === "en" ? savedLang : autoLang());
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("vv-theme", t);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("vv-lang", l);
  }, []);

  const value: Prefs = { theme, setTheme, lang, setLang, t: CONTENT[lang] };
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Prefs {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used within PrefsProvider");
  return ctx;
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { translations } from "@/lib/i18n";

export type Theme = "rose" | "emerald" | "amber" | "indigo" | "cyan";

export const THEMES: { id: Theme; name: string; colorClass: string; hex: string }[] = [
  { id: "rose", name: "Rose Neon", colorClass: "bg-rose-400", hex: "#fb7185" },
  { id: "emerald", name: "Emerald", colorClass: "bg-emerald-400", hex: "#34d399" },
  { id: "amber", name: "Amber Gold", colorClass: "bg-amber-400", hex: "#fbbf24" },
  { id: "indigo", name: "Electric Indigo", colorClass: "bg-indigo-400", hex: "#818cf8" },
  { id: "cyan", name: "Cyber Cyan", colorClass: "bg-cyan-400", hex: "#22d3ee" },
];

export type TranslationKeys = keyof (typeof translations)["es"];
export type TranslationDict = Record<TranslationKeys, string>;

type PreferencesContextType = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TranslationDict;
};

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("erp-theme") as Theme | null;
      if (saved && THEMES.some((t) => t.id === saved)) return saved;
    }
    return "rose";
  });

  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("erp-locale") as Locale | null;
      if (saved && (["es", "en", "pt", "zh"] as const).includes(saved)) return saved;
    }
    return "es";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("erp-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("erp-locale", newLocale);
  };

  const t = translations[locale] || translations.es;

  return (
    <PreferencesContext.Provider value={{ theme, setTheme, locale, setLocale, t }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return ctx;
}

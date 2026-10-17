"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale, TranslationDict } from "@/lib/i18n";
import { translations } from "@/lib/i18n";

export type Theme = "violet" | "rose" | "emerald" | "amber" | "indigo" | "cyan";

export const THEMES: { id: Theme; name: string; colorClass: string; hex: string }[] = [
  { id: "violet", name: "Clay Violet", colorClass: "bg-[#5E48E8]", hex: "#5e48e8" },
  { id: "indigo", name: "Electric Indigo", colorClass: "bg-indigo-400", hex: "#6366f1" },
  { id: "rose", name: "Rose Neon", colorClass: "bg-rose-400", hex: "#fb7185" },
  { id: "emerald", name: "Emerald", colorClass: "bg-emerald-400", hex: "#10b981" },
  { id: "amber", name: "Amber Gold", colorClass: "bg-amber-400", hex: "#f59e0b" },
  { id: "cyan", name: "Cyber Cyan", colorClass: "bg-cyan-400", hex: "#06b6d4" },
];

export type TranslationKeys = keyof (typeof translations)["es"];

type PreferencesContextType = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TranslationDict;
};

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("erp-theme") as Theme | null;
      if (saved && THEMES.some((t) => t.id === saved)) return saved;
    }
    return "violet";
  });

  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("erp-locale") as Locale | null;
      if (saved && (["es", "en", "pt", "zh"] as const).includes(saved)) return saved;
      // Also check cookie
      const match = document.cookie.match(/erp-locale=([^;]+)/);
      if (match && (["es", "en", "pt", "zh"] as const).includes(match[1] as Locale)) {
        return match[1] as Locale;
      }
    }
    return "es";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.cookie = `erp-locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }, [locale]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("erp-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("erp-locale", newLocale);
    document.cookie = `erp-locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
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

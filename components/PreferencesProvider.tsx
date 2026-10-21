"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale, TranslationDict } from "@/lib/i18n";
import { translations } from "@/lib/i18n";

export type Theme = "lime" | "violet" | "rose" | "emerald" | "amber" | "indigo" | "cyan";
export type Mode = "light" | "dark";

export const THEMES: { id: Theme; name: string; colorClass: string; hex: string }[] = [
  { id: "lime", name: "VOUT Cyber-Lime", colorClass: "bg-[#c6f827]", hex: "#c6f827" },
  { id: "violet", name: "Clay Violet", colorClass: "bg-[#6852f6]", hex: "#6852f6" },
  { id: "indigo", name: "Electric Indigo", colorClass: "bg-[#6366f1]", hex: "#6366f1" },
  { id: "rose", name: "Rose Neon", colorClass: "bg-[#f43f5e]", hex: "#f43f5e" },
  { id: "emerald", name: "Emerald", colorClass: "bg-[#10b981]", hex: "#10b981" },
  { id: "amber", name: "Amber Gold", colorClass: "bg-[#f59e0b]", hex: "#f59e0b" },
  { id: "cyan", name: "Cyber Cyan", colorClass: "bg-[#06b6d4]", hex: "#06b6d4" },
];

export type TranslationKeys = keyof (typeof translations)["es"];

type PreferencesContextType = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TranslationDict;
};

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [mode, setModeState] = useState<Mode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("erp-mode") as Mode | null;
      if (saved === "light" || saved === "dark") return saved;
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    }
    return "dark";
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("erp-theme") as Theme | null;
      if (saved && THEMES.some((t) => t.id === saved)) return saved;
    }
    return "lime";
  });

  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("erp-locale") as Locale | null;
      if (saved && (["es", "en", "pt", "zh"] as const).includes(saved)) return saved;
      const match = document.cookie.match(/erp-locale=([^;]+)/);
      if (match && (["es", "en", "pt", "zh"] as const).includes(match[1] as Locale)) {
        return match[1] as Locale;
      }
    }
    return "es";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.cookie = `erp-locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }, [locale]);

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    localStorage.setItem("erp-mode", newMode);
    document.documentElement.setAttribute("data-mode", newMode);
    if (newMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

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
    <PreferencesContext.Provider value={{ theme, setTheme, mode, setMode, locale, setLocale, t }}>
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

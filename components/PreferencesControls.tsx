"use client";

import { useEffect, useState } from "react";
import { usePreferences, THEMES } from "@/components/PreferencesProvider";
import { LOCALES } from "@/lib/i18n";

export function PreferencesControls() {
  const { theme, setTheme, mode, setMode, locale, setLocale, t } = usePreferences();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--text-muted,#94A3B8)] hover:text-[var(--primary-accent)] transition-all py-1.5 px-3 rounded-xl bg-[var(--bg-card,#121824)] border border-[var(--border-card,#1E293B)] shadow-xs hover:shadow-sm select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]"
        title="Personalización y preferencias"
        aria-label="Abrir panel de preferencias"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {/* Minimalist mode icon: Sun / Moon */}
        {mode === "dark" ? (
          <svg className="size-3.5 text-[var(--text-muted,#94A3B8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        ) : (
          <svg className="size-3.5 text-[var(--text-muted,#94A3B8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        )}

        {/* Color accent dot */}
        <span
          className="size-2 rounded-full shadow-xs ring-1 ring-white/20"
          style={{ backgroundColor: THEMES.find((x) => x.id === theme)?.hex }}
        />

        {/* Minimalist language code label */}
        <span className="font-mono font-bold text-[11px] text-[var(--text-main,#FFFFFF)]">{locale.toUpperCase()}</span>

        {/* Chevron down */}
        <svg
          className={`size-3 text-[var(--text-muted,#94A3B8)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Opens DOWNWARDS below the header button */}
          <div role="dialog" aria-label="Panel de preferencias" className="absolute right-0 top-full mt-2 w-64 p-4 rounded-3xl bg-[var(--bg-card,#121824)] border border-[var(--border-card,#1E293B)] shadow-2xl z-50 space-y-4 animate-smooth-in">
            {/* Mode selection: Claro / Oscuro */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted,#94A3B8)] font-bold mb-2">
                {t.mode || "Aspecto"}
              </p>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[var(--bg-card-subtle,#0F1520)] border border-[var(--border-card,#1E293B)]">
                <button
                  type="button"
                  onClick={() => setMode("light")}
                  className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    mode === "light"
                      ? "bg-[var(--primary-accent)] text-[var(--primary-accent-text,#0A0E14)] shadow-xs"
                      : "text-[var(--text-muted,#94A3B8)] hover:text-[var(--text-main,#FFFFFF)]"
                  }`}
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <span>{t.lightMode || "Claro"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("dark")}
                  className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    mode === "dark"
                      ? "bg-[var(--primary-accent)] text-[var(--primary-accent-text,#0A0E14)] shadow-xs"
                      : "text-[var(--text-muted,#94A3B8)] hover:text-[var(--text-main,#FFFFFF)]"
                  }`}
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                  <span>{t.darkMode || "Oscuro"}</span>
                </button>
              </div>
            </div>

            {/* Color Accent Themes */}
            <div className="border-t border-[var(--border-card,#1E293B)] pt-3">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted,#94A3B8)] font-bold mb-2.5">
                {t.theme || "Color de Acento"}
              </p>
              <div className="flex items-center justify-between gap-2 px-1">
                {THEMES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTheme(item.id)}
                    className={`size-6 rounded-full transition-all cursor-pointer ${item.colorClass} ${
                      theme === item.id
                        ? "scale-125 ring-2 ring-offset-2 ring-[var(--primary-accent)] ring-offset-[var(--bg-card,#121824)] shadow-sm"
                        : "opacity-60 hover:opacity-100 hover:scale-110"
                    }`}
                    title={item.name}
                  />
                ))}
              </div>
            </div>

            {/* Language Selection */}
            <div className="border-t border-[var(--border-card,#1E293B)] pt-3">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted,#94A3B8)] font-bold mb-2.5">
                {t.language || "Idioma"}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {LOCALES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLocale(l.code)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      locale === l.code
                        ? "bg-[var(--primary-accent)] text-[var(--primary-accent-text,#0A0E14)] font-bold shadow-xs"
                        : "text-[var(--text-muted,#94A3B8)] hover:text-[var(--text-main,#FFFFFF)] hover:bg-[var(--bg-hover,#1E293B)]"
                    }`}
                  >
                    <span>{l.label}</span>
                    <span className="font-mono text-[10px] opacity-75">{l.code.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

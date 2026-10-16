"use client";

import { useState } from "react";
import { usePreferences, THEMES } from "@/components/PreferencesProvider";
import { LOCALES } from "@/lib/i18n";

export function PreferencesControls() {
  const { theme, setTheme, locale, setLocale, t } = usePreferences();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 hover:text-white transition py-1 px-2 rounded-lg bg-white/5 border border-white/10"
        title="Themes & Language"
      >
        <span className="size-2 rounded-full" style={{ backgroundColor: THEMES.find((x) => x.id === theme)?.hex }} />
        <span>{LOCALES.find((l) => l.code === locale)?.flag}</span>
        <svg className="size-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-full mb-2 w-56 p-4 rounded-2xl bg-[#0a0f1f]/95 border border-white/15 backdrop-blur-xl shadow-2xl z-50 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">{t.theme}</p>
              <div className="flex items-center gap-2">
                {THEMES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTheme(item.id)}
                    className={`size-6 rounded-full transition-transform ${item.colorClass} ${theme === item.id ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#0a0f1f]" : "opacity-60 hover:opacity-100"}`}
                    title={item.name}
                  />
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 pt-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">{t.language}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {LOCALES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLocale(l.code)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition ${locale === l.code ? "bg-white/15 text-white font-medium" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
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

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
        className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#72729A] hover:text-[#5E48E8] transition-all py-1.5 px-3 rounded-xl bg-white border border-[#EAE9F6] shadow-xs hover:shadow-sm"
        title="Themes & Language"
      >
        <span className="size-2.5 rounded-full shadow-xs" style={{ backgroundColor: THEMES.find((x) => x.id === theme)?.hex }} />
        <span>{LOCALES.find((l) => l.code === locale)?.flag}</span>
        <svg className="size-3.5 text-[#72729A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-full mb-2 w-60 p-4 rounded-3xl bg-white/95 border border-[#EAE9F6] backdrop-blur-xl shadow-[0_20px_40px_rgba(94,72,232,0.15)] z-50 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#72729A] font-bold mb-2.5">{t.theme}</p>
              <div className="flex items-center gap-2">
                {THEMES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTheme(item.id)}
                    className={`size-6 rounded-full transition-transform ${item.colorClass} ${theme === item.id ? "scale-125 ring-2 ring-[#5E48E8] ring-offset-2 ring-offset-white" : "opacity-60 hover:opacity-100"}`}
                    title={item.name}
                  />
                ))}
              </div>
            </div>

            <div className="border-t border-[#EAE9F6] pt-3">
              <p className="text-[10px] uppercase tracking-wider text-[#72729A] font-bold mb-2.5">{t.language}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {LOCALES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLocale(l.code)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all ${locale === l.code ? "bg-[#5E48E8] text-white font-bold shadow-xs" : "text-[#72729A] hover:text-[#18182E] hover:bg-[#F3F2FD]"}`}
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

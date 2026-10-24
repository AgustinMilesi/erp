"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("vout-cookie-consent");
      if (!consent) {
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignored: localStorage not accessible
    }
  }, []);

  const handleConsent = (level: "all" | "essential") => {
    try {
      localStorage.setItem("vout-cookie-consent", level);
      document.cookie = `vout-cookie-consent=${level}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignored: localStorage not accessible
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Consentimiento de cookies y privacidad"
      role="region"
      className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-smooth-in"
    >
      <div className="p-5 rounded-2xl bg-[#121824] border border-[#1E293B] shadow-2xl text-xs space-y-3.5 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[var(--primary-accent)] animate-pulse" />
            <h4 className="font-black text-white tracking-tight text-sm">Privacidad &amp; Cookies</h4>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-[#0F1520] px-2 py-0.5 rounded-full border border-[#1E293B]">
            VOUT Retail
          </span>
        </div>

        <p className="text-slate-300 leading-relaxed text-[11.5px]">
          VOUT Retail utiliza cookies de sesión estrictamente necesarias y almacenamiento local para mantener tu caja y preferencias seguras. No empleamos cookies de rastreo publicitario.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleConsent("all")}
            className="flex-1 py-2 px-3 rounded-xl bg-[var(--primary-accent)] text-[var(--primary-accent-text)] font-bold text-xs shadow-xs hover:opacity-95 transition active:scale-95 cursor-pointer"
          >
            Aceptar Todas
          </button>
          <button
            type="button"
            onClick={() => handleConsent("essential")}
            className="flex-1 py-2 px-3 rounded-xl bg-[#0F1520] hover:bg-[#182030] border border-[#1E293B] text-slate-300 font-semibold text-xs transition active:scale-95 cursor-pointer"
          >
            Solo Esenciales
          </button>
        </div>

        <div className="text-center pt-0.5">
          <Link
            href="/legal"
            className="text-[11px] text-slate-400 hover:text-[var(--primary-accent)] underline underline-offset-2 transition"
          >
            Leer Términos, Contrato Cloud y Política de Privacidad →
          </Link>
        </div>
      </div>
    </aside>
  );
}

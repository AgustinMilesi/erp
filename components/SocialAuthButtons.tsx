/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { GoogleIcon, AppleIcon, OutlookIcon } from "@/components/SocialIcons";

export function SocialAuthButtons({
  mode = "login",
  variant = "dark",
}: {
  mode?: "login" | "register";
  variant?: "dark" | "light";
}) {
  const isDark = variant === "dark";

  return (
    <div className="space-y-4 pt-1">
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className={`w-full border-t ${isDark ? "border-white/10" : "border-[#E2E1F4]"}`} />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
          <span
            className={`${
              isDark ? "bg-[#0c1224] text-slate-400" : "bg-[#EEF0FA] text-[#72729A]"
            } px-3 font-bold select-none`}
          >
            {mode === "login" ? "O ingresar con" : "O registrarse con"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <a
          href="/api/auth/oauth/google"
          title="Iniciar sesión con Google"
          className={`group flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-semibold shadow-xs hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer ${
            isDark
              ? "bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white shadow-lg"
              : "clay-card bg-white hover:bg-[#F8F9FE] border border-[#EAE9F6] text-[#18182E]"
          }`}
        >
          <GoogleIcon className="size-4 shrink-0" />
          <span className="font-medium">Google</span>
        </a>

        <a
          href="/api/auth/oauth/apple"
          title="Iniciar sesión con Apple ID (iPhone)"
          className={`group flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-semibold shadow-xs hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer ${
            isDark
              ? "bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white shadow-lg"
              : "clay-card bg-white hover:bg-[#F8F9FE] border border-[#EAE9F6] text-[#18182E]"
          }`}
        >
          <AppleIcon className={`size-4 shrink-0 ${isDark ? "text-white" : "text-black"}`} />
          <span className="font-medium">Apple</span>
        </a>

        <a
          href="/api/auth/oauth/microsoft"
          title="Iniciar sesión con Outlook / Microsoft"
          className={`group flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-semibold shadow-xs hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer ${
            isDark
              ? "bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white shadow-lg"
              : "clay-card bg-white hover:bg-[#F8F9FE] border border-[#EAE9F6] text-[#18182E]"
          }`}
        >
          <OutlookIcon className="size-4 shrink-0" />
          <span className="font-medium">Outlook</span>
        </a>
      </div>
    </div>
  );
}

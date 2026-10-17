"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { PreferencesControls } from "@/components/PreferencesControls";
import { SubmitButton } from "@/components/SubmitButton";
import { ui } from "@/components/ui";

type ItemKey =
  | "overview"
  | "pos"
  | "sales"
  | "products"
  | "cash"
  | "inbox"
  | "contacts"
  | "forms"
  | "settings"
  | "debtors"
  | "expenses";

type NavItem = {
  href: string;
  key: ItemKey;
  label: string;
  badge?: number;
};

export function AppShell({
  organizationName,
  userEmail,
  workspaceLabel,
  signOutLabel,
  settingsLabel,
  signingOutLabel,
  navItems,
  logoutAction,
  children,
}: {
  organizationName: string;
  userEmail: string;
  workspaceLabel: string;
  signOutLabel: string;
  settingsLabel: string;
  signingOutLabel: string;
  navItems: NavItem[];
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);

  // Restore desktop sidebar preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("erp_sidebar_open");
      if (saved !== null) {
        setDesktopOpen(saved === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  function toggleDesktopSidebar() {
    setDesktopOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("erp_sidebar_open", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  // Sidebar content used in both desktop aside and mobile drawer
  const sidebarContent = (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className={ui.label}>{workspaceLabel}</p>
          <p className="text-white text-lg font-black leading-tight tracking-tight">
            {organizationName}
          </p>
        </div>
        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          aria-label="Cerrar menú"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <NavLinks items={navItems} onItemClick={() => setMobileOpen(false)} />
      </div>

      <div className="mt-auto space-y-3 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between gap-2">
          <p className="text-slate-400 text-xs truncate max-w-[150px]">{userEmail}</p>
          <PreferencesControls />
        </div>

        <div className="flex items-center gap-2">
          <form action={logoutAction} className="flex-1">
            <SubmitButton variant="ghost" pendingText={signingOutLabel} className="w-full text-center text-xs py-2">
              {signOutLabel}
            </SubmitButton>
          </form>

          <Link
            href="/app/settings"
            onClick={() => setMobileOpen(false)}
            className="p-2 border border-white/15 hover:border-rose-400 hover:text-rose-400 text-slate-300 rounded-full transition-colors flex items-center justify-center shrink-0"
            title={settingsLabel}
            aria-label={settingsLabel}
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.75"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* 1. Header Superior Unificado con Botón Hamburguesa */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 bg-slate-950/90 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          {/* Botón Hamburguesa (funciona en móvil y escritorio para dar más espacio) */}
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileOpen(!mobileOpen);
              } else {
                toggleDesktopSidebar();
              }
            }}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition border border-white/10 flex items-center justify-center active:scale-95 shadow-sm"
            title="Alternar menú / Más espacio"
            aria-label="Abrir o cerrar menú"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-rose-400 font-black text-lg">⚡</span>
            <span className="text-white font-bold text-sm sm:text-base tracking-tight truncate max-w-[200px] sm:max-w-xs">
              {organizationName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PreferencesControls />
          <Link
            href="/app/settings"
            className="p-2 border border-white/15 hover:border-rose-400 hover:text-rose-400 text-slate-300 rounded-full transition-colors flex items-center justify-center shrink-0"
            title={settingsLabel}
            aria-label={settingsLabel}
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.75"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </header>

      {/* 2. Cuerpo Principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar de Escritorio (Collapsible) */}
        {desktopOpen && (
          <aside className="hidden md:flex w-64 flex-col shrink-0 border-r border-white/10 p-5 bg-slate-950/40">
            {sidebarContent}
          </aside>
        )}

        {/* Drawer Móvil con Backdrop */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop oscuro */}
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            {/* Panel lateral deslizante */}
            <div className="relative w-72 max-w-[85vw] bg-slate-950 border-r border-white/10 p-5 flex flex-col z-10 shadow-2xl">
              {sidebarContent}
            </div>
          </div>
        )}

        {/* Contenido Principal (ocupa todo el espacio si se colapsa el sidebar) */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

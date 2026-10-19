import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { getSession } from "@/lib/auth/session";
import { PreferencesControls } from "@/components/PreferencesControls";

export const metadata: Metadata = { title: "Acceso al Sistema" };

export default async function LoginPage() {
  if (await getSession()) redirect("/app");

  return (
    <main className="min-h-screen flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden bg-[#0a0f1f]">
      {/* Decorative subtle ambient lights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-rose-400/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="size-8 rounded-lg bg-rose-400 flex items-center justify-center text-slate-900 font-black text-sm">
            E
          </div>
          <span className="font-bold tracking-tight text-white group-hover:text-rose-400 transition">
            ERP & POS
          </span>
        </Link>
        <PreferencesControls />
      </header>

      {/* Centered Login Card */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div className="border border-white/10 rounded-3xl bg-white/[0.03] backdrop-blur-xl p-8 sm:p-10 shadow-2xl space-y-8">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-400/10 border border-rose-400/30 flex items-center justify-center text-rose-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Acceso al Sistema</h1>
            <p className="text-sm text-slate-400">
              Ingresá tus credenciales para acceder al panel de ventas, caja y gestión de inventario.
            </p>
          </div>

          {/* Guest Access for Recruiters & Testing */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/5 border border-emerald-500/30 space-y-3 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                Acceso para Reclutadores
              </span>
              <span className="text-[10px] font-black bg-emerald-500/25 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                1-CLICK DEMO
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Explorá el sistema en vivo con catálogo de productos, terminal POS y arqueos de caja sin necesidad de registrarte.
            </p>
            <Link
              href="/demo"
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm text-center block transition shadow-md shadow-emerald-500/20"
            >
              🚀 Entrar como Invitado (Modo Demo) →
            </Link>
          </div>

          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#0a0f1f] px-3 text-[11px] text-slate-500 uppercase tracking-widest font-semibold shrink-0">
              o con credenciales
            </span>
            <div className="border-t border-white/10 w-full" />
          </div>

          <LoginForm />

          <div className="pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-slate-400">
              ¿No tenés una cuenta?{" "}
              <Link href="/register" className="text-white hover:text-rose-400 font-semibold transition">
                Registrar empresa
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 pt-6">
        <p>© {new Date().getFullYear()} ERP & POS Engine · Operación comercial y punto de venta.</p>
        <Link href="/" className="hover:text-slate-300 transition">
          ← Volver al inicio
        </Link>
      </footer>
    </main>
  );
}


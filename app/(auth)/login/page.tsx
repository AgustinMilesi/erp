import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { getSession } from "@/lib/auth/session";
import { PreferencesControls } from "@/components/PreferencesControls";

export const metadata: Metadata = { title: "Cuenta VOUT • Acceso al Sistema" };

export default async function LoginPage() {
  if (await getSession()) redirect("/app");

  return (
    <main className="min-h-screen flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden bg-[#0A0E14] text-white">
      {/* Decorative Cyber-Lime & Obsidian Ambient Lights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-[#C6F827]/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#C6F827]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between relative z-10">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="size-9 rounded-xl bg-[#0A0E14] border border-[#1E293B] flex items-center justify-center shadow-[0_0_15px_rgba(198,248,39,0.3)] group-hover:scale-105 transition-transform shrink-0">
            <span className="font-black text-lg bg-gradient-to-br from-[#C6F827] via-[#10B981] to-[#00FF88] bg-clip-text text-transparent flex items-baseline leading-none select-none pl-0.5">
              V<span className="text-[11px] font-black text-[#C6F827] ml-0.5">r</span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-black tracking-wider text-white text-base leading-tight">
              VOUT <span className="text-[#C6F827] font-semibold">Retail</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-[#94A3B8] font-bold">
              Autonomous Cloud Ecosystem
            </span>
          </div>
        </Link>
        <PreferencesControls />
      </header>

      {/* Centered Login Card */}
      <div className="w-full max-w-md mx-auto my-auto py-8 relative z-10">
        <div className="border border-[#C6F827]/20 rounded-3xl bg-[#121824]/90 backdrop-blur-2xl p-8 sm:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] space-y-7">
          <div className="space-y-3 text-center sm:text-left">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#C6F827]/15 border border-[#C6F827]/30 flex items-center justify-center text-[#C6F827] shadow-[0_0_15px_rgba(198,248,39,0.2)]">
                <span className="font-black text-xl">⚡</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#C6F827]/15 text-[#C6F827] border border-[#C6F827]/30">
                CUENTA VOUT
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Accedé a tu Cuenta VOUT</h1>
              <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                Tu llave digital unificada. La misma cuenta que utilizás en <strong className="text-white">VOUT Pocket</strong>, <strong className="text-white">VOUT Cargo</strong> y <strong className="text-white">VOUT Inbox</strong>.
              </p>
            </div>
          </div>

          {/* Prestige VOUT Membership Banner */}
          <div className="p-3.5 rounded-2xl bg-[#0F1520] border border-[#1E293B] space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#C6F827] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C6F827]">
                Membresía VOUT Oficial
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-normal">
              Acceso total al punto de venta, arqueo de caja chica, control de stock y reportes financieros integrados.
            </p>
          </div>

          {/* Guest Access for Recruiters & Testing */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#C6F827]/10 to-transparent border border-[#C6F827]/25 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Acceso de Evaluación
              </span>
              <span className="text-[9px] font-black bg-[#C6F827] text-[#0A0E14] px-2 py-0.5 rounded-full font-mono">
                1-CLICK DEMO
              </span>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Probá la terminal POS y los arqueos de caja en vivo sin necesidad de registro.
            </p>
            <Link
              href="/demo"
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/15 hover:border-[#C6F827]/40 font-bold text-xs text-center block transition cursor-pointer"
            >
              🚀 Entrar como Invitado (Modo Demo) →
            </Link>
          </div>

          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-[#1E293B] w-full" />
            <span className="bg-[#121824] px-3 text-[10px] text-[#64748B] uppercase tracking-widest font-black shrink-0">
              o con tu Cuenta VOUT
            </span>
            <div className="border-t border-[#1E293B] w-full" />
          </div>

          <LoginForm />

          <div className="pt-3 border-t border-[#1E293B] text-center">
            <p className="text-xs text-[#94A3B8]">
              ¿Aún no tenés una Cuenta VOUT?{" "}
              <Link href="/register" className="text-[#C6F827] hover:underline font-bold transition">
                Crear Cuenta VOUT
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-[#64748B] pt-6 relative z-10">
        <p>© {new Date().getFullYear()} VOUT Ecosystem · Retail Engine & Point of Sale.</p>
        <Link href="/" className="hover:text-white transition">
          ← Volver al inicio
        </Link>
      </footer>
    </main>
  );
}

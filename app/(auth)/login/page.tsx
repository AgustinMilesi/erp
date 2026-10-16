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
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Acceso al Sistema</h1>
            <p className="text-sm text-slate-400">
              Ingresá tus credenciales para acceder a tu panel de ventas y gestión.
            </p>
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


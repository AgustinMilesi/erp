import Link from "next/link";
import { Headline } from "@/components/Headline";
import { PosIcon } from "@/components/MailIcon";
import { PreferencesBlock } from "@/components/PreferencesBlock";
import { PreferencesControls } from "@/components/PreferencesControls";
import { ui } from "@/components/ui";

const points = [
  {
    label: "Punto de Venta (POS Cloud)",
    text: "Cobro ultrarrápido con lector de códigos de barra, medios combinados y emisión de tickets.",
  },
  {
    label: "Caja y Arqueos en Tiempo Real",
    text: "Control estricto de turnos, arqueo de efectivo y trazabilidad auditada de diferencias.",
  },
  {
    label: "Inventario Centralizado",
    text: "Descuento automático por cada venta, alertas de stock crítico e importación masiva.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative overflow-hidden animate-smooth-in bg-[var(--bg-page,#0A0E14)] text-slate-100">
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between pb-6 border-b border-[#1E293B]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="size-10 rounded-2xl bg-[var(--primary-accent)] text-[var(--primary-accent-text)] flex items-center justify-center font-black text-base shadow-[var(--primary-accent-shadow)] transition-transform group-hover:scale-105">
            V
          </div>
          <div>
            <span className="font-black tracking-tight text-base text-white block leading-none">
              VOUT Retail
            </span>
            <span className="text-xs text-slate-400 font-medium">Cloud POS &amp; Store Management Suite</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <PreferencesControls />
          <Link
            href="/login"
            className="hidden sm:inline-flex px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--primary-accent)] hover:bg-[var(--primary-accent)]/10 rounded-xl border border-[#1E293B] transition"
          >
            Iniciar Sesión
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full max-w-6xl mx-auto my-auto py-10 space-y-12">
        <div className="grid md:grid-cols-5 gap-12 md:gap-20 items-center">
          <div className="md:col-span-3 space-y-8">
            <Headline light={["Sistema ágil de", "Punto de Venta,"]} bold="listo para operar." />
            <p className="text-base text-slate-400 leading-relaxed max-w-xl">
              Diseñado para retail, almacenes y comercios de alto volumen. Opera bajo infraestructura en la nube administrada con respaldos automáticos y 99.9% de uptime garantizado.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/demo"
                className="px-6 py-3.5 rounded-2xl bg-[var(--primary-accent)] text-[var(--primary-accent-text)] font-black text-sm shadow-[var(--primary-accent-shadow)] transition flex items-center gap-2 group hover:opacity-95"
              >
                <span>✨ Entrar como Invitado</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-black/20 dark:bg-white/20 px-2 py-0.5 rounded-full">
                  1-Click Demo
                </span>
              </Link>
              <Link href="/register" className={ui.button}>
                Crear Cuenta VOUT
              </Link>
              <Link href="/login" className={`${ui.link} text-xs uppercase tracking-wider font-bold`}>
                Acceder a Consola →
              </Link>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <PosIcon />
            <div className="space-y-4">
              {points.map((point) => (
                <div key={point.label} className="p-4 rounded-2xl bg-[#121824] border border-[#1E293B] shadow-sm">
                  <p className={ui.label}>{point.label}</p>
                  <p className="text-slate-200 text-sm font-medium mt-1">{point.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Preferences Block */}
        <section className="pt-4">
          <PreferencesBlock />
        </section>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 pt-6 border-t border-[#1E293B]">
        <p>© {new Date().getFullYear()} VOUT Retail · Managed Retail Cloud &amp; Point of Sale.</p>
        <div className="flex items-center gap-5">
          <Link href="/legal" className="hover:text-[var(--primary-accent)] transition">
            Términos &amp; Condiciones
          </Link>
          <Link href="/legal" className="hover:text-[var(--primary-accent)] transition">
            Privacidad &amp; Datos
          </Link>
          <Link href="/legal" className="hover:text-[var(--primary-accent)] transition">
            Cookies
          </Link>
        </div>
      </footer>
    </main>
  );
}

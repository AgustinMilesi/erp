import Link from "next/link";
import { Headline } from "@/components/Headline";
import { PosIcon } from "@/components/MailIcon";
import { PreferencesBlock } from "@/components/PreferencesBlock";
import { PreferencesControls } from "@/components/PreferencesControls";
import { ui } from "@/components/ui";

const points = [
  {
    label: "Punto de Venta (POS)",
    text: "Cobro rápido con lector de códigos de barra, medios combinados y tickets térmicos.",
  },
  {
    label: "Caja y Arqueos",
    text: "Control estricto de turnos, arqueo de efectivo y trazabilidad de diferencias.",
  },
  {
    label: "Inventario y Stock",
    text: "Descuento automático en cada venta, alertas de stock mínimo e importación masiva.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative overflow-hidden animate-smooth-in">
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between pb-6 border-b border-[#EAE9F6]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="size-10 rounded-2xl bg-gradient-to-br from-[#6852F6] to-[#5538EA] flex items-center justify-center text-white font-black text-sm shadow-[0_4px_12px_rgba(85,56,234,0.35)]">
            E
          </div>
          <div>
            <span className="font-bold tracking-tight text-base text-[#18182E] block leading-none">
              Milesi ERP &amp; POS
            </span>
            <span className="text-xs text-[#72729A] font-medium">Gestión comercial y punto de venta</span>
          </div>
        </Link>
        <PreferencesControls />
      </header>

      {/* Main Content */}
      <div className="w-full max-w-6xl mx-auto my-auto py-10 space-y-12">
        <div className="grid md:grid-cols-5 gap-12 md:gap-20 items-center">
          <div className="md:col-span-3 space-y-8">
            <Headline light={["Sistema ágil de", "Punto de Venta,"]} bold="listo para operar." />
            <div className="pt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/demo"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-[0_4px_18px_rgba(16,185,129,0.35)] transition flex items-center gap-2 group"
              >
                <span>✨ Entrar como Invitado</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-950/20 px-2 py-0.5 rounded-full">
                  1-Click Demo
                </span>
              </Link>
              <Link href="/register" className={ui.button}>
                Crear cuenta
              </Link>
              <Link href="/login" className={`${ui.link} text-xs uppercase tracking-wider font-bold`}>
                Acceder al sistema →
              </Link>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <PosIcon />
            <div className="space-y-4">
              {points.map((point) => (
                <div key={point.label} className="clay-card p-4 rounded-2xl">
                  <p className={ui.label}>{point.label}</p>
                  <p className="text-[#18182E] text-sm font-medium">{point.text}</p>
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
      <footer className="w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-[#72729A] pt-6 border-t border-[#EAE9F6]">
        <p>© 2026 Milesi ERP &amp; POS · Sistema comercial y punto de venta.</p>
        <div className="flex items-center gap-4">
          <a href="https://saas-am.vercel.app" target="_blank" rel="noopener noreferrer" className="hover:text-[#5E48E8] transition font-medium">
            Contact SaaS ↗
          </a>
          <a href="https://agustinmilesi-contact.vercel.app" target="_blank" rel="noopener noreferrer" className="hover:text-[#5E48E8] transition font-medium">
            Agustín Milesi ↗
          </a>
        </div>
      </footer>
    </main>
  );
}

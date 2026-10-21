import Link from "next/link";
import { PreferencesControls } from "@/components/PreferencesControls";

export const metadata = {
  title: "Términos Legales, Privacidad & SLA · VOUT Retail",
  description: "Contrato de Servicio Administrado Cloud, Política de Privacidad, SLA 99.9% y Cookies de VOUT Retail.",
};

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-[#0A0E14] text-slate-100 p-4 sm:p-8 lg:p-12 animate-smooth-in">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Navigation Header */}
        <header className="flex items-center justify-between pb-6 border-b border-[#1E293B]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="size-9 rounded-2xl bg-[var(--primary-accent)] text-[var(--primary-accent-text)] flex items-center justify-center font-black text-sm shadow-[var(--primary-accent-shadow)] transition-transform group-hover:scale-105">
              V
            </div>
            <div>
              <span className="font-black text-white text-base block leading-none">VOUT Retail</span>
              <span className="text-[11px] text-slate-400 font-medium">Marco Legal &amp; Contratos de Infraestructura Cloud</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <PreferencesControls />
            <Link
              href="/"
              className="text-xs font-bold text-[var(--primary-accent)] hover:underline underline-offset-4"
            >
              ← Volver al inicio
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121824] border border-[#1E293B] text-[11px] font-mono font-bold text-[var(--primary-accent)]">
            <span className="size-2 rounded-full bg-[var(--primary-accent)]" />
            <span>Última actualización: Octubre 2026 · Versión 3.0</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Marco Legal, Contrato de Hosting &amp; Privacidad
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
            VOUT Retail opera bajo un modelo de Software Administrado en la Nube (Managed SaaS). Proveemos la infraestructura de alta disponibilidad, copias de seguridad continuas, monitoreo preventivo y soporte técnico integral para la operación diaria de tu comercio.
          </p>
        </div>

        {/* Document Sections */}
        <div className="space-y-8">
          {/* 1. Contrato de Hosting y Servicio Administrado */}
          <section className="p-6 sm:p-8 rounded-3xl bg-[#121824] border border-[#1E293B] space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="size-8 rounded-xl bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] flex items-center justify-center font-black text-sm">
                01
              </span>
              <h2 className="text-xl font-bold text-white">
                Contrato de Servicio Administrado &amp; Hosting Cloud
              </h2>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed pl-1">
              <p>
                <strong>1.1. Naturaleza del Servicio:</strong> VOUT comercializa el aprovisionamiento de infraestructura de nube, alojamiento gestionado de alta disponibilidad, monitoreo 24/7 y mantenimiento técnico evolutivo para terminales POS e inventarios de VOUT Retail. El cliente adquiere un derecho de uso bajo suscripción, manteniéndose el código fuente y propiedad intelectual bajo reserva exclusiva de VOUT.
              </p>
              <p>
                <strong>1.2. Mantenimiento y Actualizaciones:</strong> Toda suscripción incluye actualizaciones continuas de seguridad, corrección de incidencias y nuevas optimizaciones de caja sin costo adicional de consultoría.
              </p>
              <p>
                <strong>1.3. Copias de Seguridad y Resguardo:</strong> El sistema genera copias de respaldo continuas y redundantes de todas las ventas, stocks, arqueos de caja y clientes, permitiendo la restauración inmediata ante cualquier eventualidad.
              </p>
              <p>
                <strong>1.4. Propiedad del Negocio y Datos:</strong> Toda la información de productos, listas de precios, balances y movimientos fiscales pertenece 100% al cliente suscriptor. VOUT no retiene datos ni bloquea exportaciones ante eventuales bajas de servicio.
              </p>
            </div>
          </section>

          {/* 2. Acuerdo de Nivel de Servicio (SLA) */}
          <section className="p-6 sm:p-8 rounded-3xl bg-[#121824] border border-[#1E293B] space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="size-8 rounded-xl bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] flex items-center justify-center font-black text-sm">
                02
              </span>
              <h2 className="text-xl font-bold text-white">
                Acuerdo de Nivel de Servicio (SLA 99.9%)
              </h2>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed pl-1">
              <p>
                <strong>2.1. Disponibilidad de Punto de Venta:</strong> Garantizamos una operatividad anual de <strong>99.9%</strong> en las pasarelas de cobro y registro de tickets del POS.
              </p>
              <p>
                <strong>2.2. Modo Fuera de Línea (Offline Resilience):</strong> Ante cortes imprevistos de conexión a internet del local, el POS de VOUT Retail mantiene la memoria de turnos y almacena temporalmente los comprobantes hasta restablecer el enlace con la nube.
              </p>
              <p>
                <strong>2.3. Soporte Operativo:</strong> Asistencia prioritaria para incidentes de caja en menos de 2 horas.
              </p>
            </div>
          </section>

          {/* 3. Privacidad y Seguridad */}
          <section className="p-6 sm:p-8 rounded-3xl bg-[#121824] border border-[#1E293B] space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="size-8 rounded-xl bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] flex items-center justify-center font-black text-sm">
                03
              </span>
              <h2 className="text-xl font-bold text-white">
                Seguridad, Cifrado &amp; Privacidad
              </h2>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed pl-1">
              <p>
                <strong>3.1. Cero Monetización de Datos:</strong> VOUT no vende información de hábitos de consumo, márgenes ni volúmenes de facturación a ningún proveedor o entidad externa.
              </p>
              <p>
                <strong>3.2. Cifrado en Reposo y Tránsito:</strong> Comunicaciones cifradas vía TLS 1.3 y bases de datos con encriptación AES-256.
              </p>
            </div>
          </section>

          {/* 4. Cookies */}
          <section className="p-6 sm:p-8 rounded-3xl bg-[#121824] border border-[#1E293B] space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="size-8 rounded-xl bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] flex items-center justify-center font-black text-sm">
                04
              </span>
              <h2 className="text-xl font-bold text-white">
                Cookies &amp; Almacenamiento Local
              </h2>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed pl-1">
              <p>
                Uso restringido a tokens de autenticación de cajero y claves de configuración local (tema obsidian, acento de color, idioma y estado de caja). Cero cookies publicitarias de terceros.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="pt-8 pb-12 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} VOUT Retail · Managed Retail Cloud.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[var(--primary-accent)] transition">
              Inicio
            </Link>
            <a href="mailto:soporte@vout.cloud" className="hover:text-[var(--primary-accent)] transition">
              Canal de Soporte ↗
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

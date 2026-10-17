import Link from "next/link";
import { Headline } from "@/components/Headline";
import { PosIcon } from "@/components/MailIcon";
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
    <main className="min-h-screen flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-6xl grid md:grid-cols-5 gap-12 md:gap-20">
        <div className="md:col-span-3 space-y-8">
          <Headline light={["Sistema ágil de", "Punto de Venta,"]} bold="listo para operar." />
          <div className="pt-6 flex flex-wrap items-center gap-6">
            <Link href="/register" className={ui.button}>
              Crear cuenta
            </Link>
            <Link href="/login" className={`${ui.link} text-sm uppercase tracking-wider`}>
              Acceder al sistema
            </Link>
          </div>
        </div>

        <div className="md:col-span-2 space-y-8 md:pt-24">
          <PosIcon />
          <div className="space-y-6">
            {points.map((point) => (
              <div key={point.label}>
                <p className={ui.label}>{point.label}</p>
                <p className="text-white text-lg">{point.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

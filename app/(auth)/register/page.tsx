import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { RegisterForm } from "@/components/auth-forms";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Registrar comercio" };

export default async function RegisterPage() {
  if (await getSession()) redirect("/app");
  return (
    <AuthShell
      light={["Empezá a operar", "tu negocio."]}
      bold="Crear cuenta."
      side={
        <>
          <p>Obtené tu espacio de trabajo con punto de venta, inventario y control de caja.</p>
          <p>
            ¿Ya tenés una cuenta?{" "}
            <Link href="/login" className="text-white hover:text-rose-400 transition">
              Iniciar sesión
            </Link>
            .
          </p>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}

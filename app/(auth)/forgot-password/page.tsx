import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ForgotForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      light={["Recuperá el acceso", "a tu sistema."]}
      bold="Restablecer clave."
      side={
        <>
          <p>Ingresá tu correo electrónico para recibir un enlace de recuperación seguro por 1 hora.</p>
          <p>
            <Link href="/login" className="text-white hover:text-rose-400 transition">
              ← Volver al inicio de sesión
            </Link>
          </p>
        </>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}

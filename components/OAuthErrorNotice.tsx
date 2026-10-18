"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { toast } from "sonner";

function NoticeContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("oauth_error");
  const provider = searchParams.get("provider");

  const providerName =
    provider === "google"
      ? "Google"
      : provider === "apple"
      ? "Apple ID (iPhone)"
      : provider === "microsoft"
      ? "Outlook / Microsoft"
      : "OAuth";

  let message: string | null = null;

  if (oauthError === "not_configured") {
    message = `El inicio de sesión con ${providerName} aún no está configurado en esta instancia. Agregá las credenciales en tus variables de entorno.`;
  } else if (oauthError === "invalid_state") {
    message = "La sesión de autenticación expiró. Por favor, intentá nuevamente.";
  } else if (oauthError === "access_denied") {
    message = `El inicio de sesión con ${providerName} fue cancelado por el usuario.`;
  } else if (oauthError === "no_email") {
    message = `${providerName} no devolvió una dirección de email. Asegurate de autorizar el acceso al email.`;
  } else if (oauthError) {
    message = `No se pudo iniciar sesión con ${providerName} (${oauthError}). Por favor, intentá nuevamente o usá tu contraseña.`;
  }

  useEffect(() => {
    if (message) {
      toast.error(message);
    }
  }, [message]);

  if (!message) return null;

  return (
    <div className="p-3.5 mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium flex items-start gap-2.5 animate-smooth-in">
      <span className="text-base leading-none">⚠️</span>
      <div className="flex-1">{message}</div>
    </div>
  );
}

export function OAuthErrorNotice() {
  return (
    <Suspense fallback={null}>
      <NoticeContent />
    </Suspense>
  );
}

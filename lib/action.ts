// Shape returned by every server action so the UI can show a toast or redirect.
export type ActionResult =
  | { ok: true; message?: string; redirectTo?: string; data?: Record<string, string> }
  | { ok: false; error: string };

export const ok = (
  message?: string,
  extra?: { redirectTo?: string; data?: Record<string, string> },
): ActionResult => ({ ok: true, message, ...extra });

export const fail = (error: string): ActionResult => ({ ok: false, error });

import Link from "next/link";
import { ui } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { getServerTranslations } from "@/lib/i18n-server";

// The till is full screen on purpose: no sidebar, so there is room for the cart.
export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const [session, { t }] = await Promise.all([
    requireSession(),
    getServerTranslations(),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="print:hidden flex items-center justify-between gap-4 border-b border-white/10 px-4 md:px-8 py-3">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/app" className={`${ui.muted} text-sm hover:text-rose-400 transition whitespace-nowrap`}>
            ← {t.overview}
          </Link>
          <span className="text-white font-black truncate">{session.organization.name}</span>
        </div>
        <span className="text-slate-500 text-sm truncate">{session.user.name}</span>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}

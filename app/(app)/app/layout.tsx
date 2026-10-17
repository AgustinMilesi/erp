import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { PreferencesControls } from "@/components/PreferencesControls";
import { SubmitButton } from "@/components/SubmitButton";
import { ui } from "@/components/ui";
import { logoutAction } from "@/app/actions/auth";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getServerTranslations } from "@/lib/i18n-server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [session, { t }] = await Promise.all([
    requireSession(),
    getServerTranslations(),
  ]);
  const [unread, debtorsCount] = await Promise.all([
    db.message.count({
      where: { organizationId: session.organization.id, status: "NEW" },
    }),
    db.debtor.count({
      where: { organizationId: session.organization.id },
    }),
  ]);

  const enabled = new Set(session.organization.enabledModules || [
    "overview",
    "sales",
    "products",
    "cash",
    "debtors",
    "expenses",
    "inbox",
    "contacts",
    "forms",
  ]);

  const allNavItems = [
    { href: "/app", key: "overview" as const, label: "Overview" },
    { href: "/app/sales", key: "sales" as const, label: "Sales" },
    { href: "/app/products", key: "products" as const, label: "Products" },
    { href: "/app/debtors", key: "debtors" as const, label: "Debtors", badge: debtorsCount > 0 ? debtorsCount : undefined },
    { href: "/app/expenses", key: "expenses" as const, label: "Expenses" },
    { href: "/app/cash", key: "cash" as const, label: "Cash" },
    { href: "/app/inbox", key: "inbox" as const, label: "Inbox", badge: unread > 0 ? unread : undefined },
    { href: "/app/contacts", key: "contacts" as const, label: "Contacts" },
    { href: "/app/forms", key: "forms" as const, label: "Forms" },
  ];

  const filteredNavItems = allNavItems.filter((it) => enabled.has(it.key));

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <aside className="border-b md:border-b-0 md:border-r border-white/10 p-6 md:p-8 flex flex-col gap-6 md:gap-10">
        <div>
          <p className={ui.label}>{t.workspace}</p>
          <p className="text-white text-xl font-black leading-tight">{session.organization.name}</p>
        </div>

        <NavLinks items={filteredNavItems} />

        <div className="md:mt-auto space-y-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between gap-2">
            <p className="text-slate-400 text-xs truncate max-w-[150px]">{session.user.email}</p>
            <PreferencesControls />
          </div>

          <div className="flex items-center gap-2">
            <form action={logoutAction} className="flex-1">
              <SubmitButton variant="ghost" pendingText={t.signingOut} className="w-full text-center">
                {t.signOut}
              </SubmitButton>
            </form>

            <Link
              href="/app/settings"
              className="p-2 border border-white/15 hover:border-rose-400 hover:text-rose-400 text-slate-300 rounded-full transition-colors flex items-center justify-center shrink-0"
              title={t.settings}
              aria-label={t.settings}
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.75"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </aside>

      <main className="p-6 md:p-12 w-full max-w-5xl">{children}</main>
    </div>
  );
}

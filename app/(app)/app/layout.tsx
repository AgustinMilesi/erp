import { AppShell } from "@/components/AppShell";
import { logoutAction } from "@/app/actions/auth";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getServerTranslations } from "@/lib/i18n-server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [session, { t }] = await Promise.all([
    requireSession(),
    getServerTranslations(),
  ]);
  const [unread] = await Promise.all([
    db.message.count({
      where: { organizationId: session.organization.id, status: "NEW" },
    }),
  ]);

  const enabled = new Set(session.organization.enabledModules || [
    "overview",
    "pos",
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
    { href: "/app/pos", key: "pos" as const, label: "Punto de Venta" },
    { href: "/app/sales", key: "sales" as const, label: "Sales" },
    { href: "/app/products", key: "products" as const, label: "Products" },
    { href: "/app/debtors", key: "debtors" as const, label: "Debtors" },
    { href: "/app/expenses", key: "expenses" as const, label: "Expenses" },
    { href: "/app/cash", key: "cash" as const, label: "Cash" },
    { href: "/app/inbox", key: "inbox" as const, label: "Inbox", badge: unread > 0 ? unread : undefined },
    { href: "/app/contacts", key: "contacts" as const, label: "Contacts" },
    { href: "/app/forms", key: "forms" as const, label: "Forms" },
  ];

  const filteredNavItems = allNavItems.filter((it) => enabled.has(it.key));

  return (
    <AppShell
      organizationName={session.organization.name}
      userEmail={session.user.email}
      workspaceLabel={t.workspace}
      signOutLabel={t.signOut}
      settingsLabel={t.settings}
      signingOutLabel={t.signingOut}
      navItems={filteredNavItems}
      logoutAction={logoutAction}
    >
      {children}
    </AppShell>
  );
}

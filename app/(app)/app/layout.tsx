import { NavLinks } from "@/components/NavLinks";
import { SubmitButton } from "@/components/SubmitButton";
import { ui } from "@/components/ui";
import { logoutAction } from "@/app/actions/auth";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const unread = await db.message.count({
    where: { organizationId: session.organization.id, status: "NEW" },
  });

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <aside className="border-b md:border-b-0 md:border-r border-white/10 p-6 md:p-8 flex flex-col gap-6 md:gap-10">
        <div>
          <p className={ui.label}>Workspace</p>
          <p className="text-white text-xl font-black leading-tight">{session.organization.name}</p>
        </div>

        <NavLinks
          items={[
            { href: "/app", label: "Overview" },
            { href: "/pos", label: "Point of sale" },
            { href: "/app/sales", label: "Sales" },
            { href: "/app/products", label: "Products" },
            { href: "/app/cash", label: "Cash" },
            { href: "/app/inbox", label: "Inbox", badge: unread },
            { href: "/app/contacts", label: "Contacts" },
            { href: "/app/forms", label: "Forms" },
            { href: "/app/settings", label: "Settings" },
          ]}
        />

        <div className="md:mt-auto space-y-3">
          <p className="text-slate-400 text-sm break-all">{session.user.email}</p>
          <form action={logoutAction}>
            <SubmitButton variant="ghost" pendingText="Signing out...">
              Sign out
            </SubmitButton>
          </form>
        </div>
      </aside>

      <main className="p-6 md:p-12 w-full max-w-5xl">{children}</main>
    </div>
  );
}

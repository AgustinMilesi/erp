import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/Headline";
import { ui } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const { organization, user } = await requireSession();
  const orgId = organization.id;

  const [unread, contacts, forms, latest] = await Promise.all([
    db.message.count({ where: { organizationId: orgId, status: "NEW" } }),
    db.contact.count({ where: { organizationId: orgId } }),
    db.form.count({ where: { organizationId: orgId, active: true } }),
    db.message.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, subject: true, status: true, createdAt: true },
    }),
  ]);

  const stats = [
    { label: "New messages", value: unread, href: "/app/inbox?status=NEW" },
    { label: "Contacts", value: contacts, href: "/app/contacts" },
    { label: "Live forms", value: forms, href: "/app/forms" },
  ];

  return (
    <div className="space-y-12">
      <div className="space-y-2">
        <PageTitle light="Hi," bold={`${user.name.split(" ")[0]}.`} />
        <p className={ui.muted}>This is what&apos;s happening in {organization.name}.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className={`${ui.card} p-6 hover:border-rose-400/60 transition`}>
            <p className={ui.label}>{stat.label}</p>
            <p className="text-5xl font-light text-white">{stat.value}</p>
          </Link>
        ))}
      </div>

      <section className="space-y-4">
        <p className={ui.label}>Latest messages</p>
        {latest.length === 0 ? (
          <p className={ui.muted}>
            Nothing yet. Share your form from the{" "}
            <Link href="/app/forms" className={ui.link}>Forms</Link> page and messages will show up here.
          </p>
        ) : (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {latest.map((m) => (
              <li key={m.id}>
                <Link href={`/app/inbox/${m.id}`} className="flex items-center justify-between gap-4 py-4 hover:text-rose-400 transition">
                  <span className="min-w-0">
                    <span className={`block truncate ${m.status === "NEW" ? "text-white font-semibold" : "text-slate-300"}`}>
                      {m.subject}
                    </span>
                    <span className="block text-sm text-slate-500 truncate">{m.name}</span>
                  </span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(m.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

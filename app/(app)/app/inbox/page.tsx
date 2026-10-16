import type { Metadata } from "next";
import Link from "next/link";
import type { MessageStatus } from "@prisma/client";
import { PageTitle } from "@/components/Headline";
import { ui } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getServerTranslations } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Inbox" };

const PAGE_SIZE = 25;

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const [{ organization }, { t }] = await Promise.all([
    requireSession(),
    getServerTranslations(),
  ]);
  const query = await searchParams;

  const tabs: { label: string; value?: MessageStatus }[] = [
    { label: t.all },
    { label: t.statusNew, value: "NEW" },
    { label: t.statusArchived, value: "ARCHIVED" },
  ];

  const status = tabs.find((tab) => tab.value && tab.value === query.status)?.value;
  const page = Math.max(1, Number(query.page) || 1);
  const where = { organizationId: organization.id, ...(status ? { status } : {}) };

  const [messages, total] = await Promise.all([
    db.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, subject: true, status: true, createdAt: true },
    }),
    db.message.count({ where }),
  ]);

  const href = (p: number) =>
    `/app/inbox?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) })}`;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const titleWords = t.yourInbox.split(" ");
  const titleLight = titleWords[0];
  const titleBold = titleWords.slice(1).join(" ") ? `${titleWords.slice(1).join(" ")}.` : ".";

  return (
    <div className="space-y-8">
      <div>
        <PageTitle light={titleLight} bold={titleBold} />
        <p className={`${ui.muted} mt-2`}>{t.inboxSubtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = tab.value === status;
          return (
            <Link
              key={tab.label}
              href={tab.value ? `/app/inbox?status=${tab.value}` : "/app/inbox"}
              className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider transition-colors ${
                active ? "bg-rose-400 text-slate-900 font-semibold" : "border border-white/15 text-slate-300 hover:border-rose-400"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {messages.length === 0 ? (
        <p className={ui.muted}>{t.noMessages}</p>
      ) : (
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {messages.map((m) => (
            <li key={m.id}>
              <Link href={`/app/inbox/${m.id}`} className="flex items-center gap-4 py-4 hover:text-rose-400 transition">
                <span
                  aria-label={m.status === "NEW" ? t.statusNew : undefined}
                  className={`w-2 h-2 rounded-full shrink-0 ${m.status === "NEW" ? "bg-rose-400" : "bg-transparent"}`}
                />
                <span className="min-w-0 flex-1">
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

      {pages > 1 && (
        <div className="flex items-center gap-4 text-sm">
          {page > 1 && <Link href={href(page - 1)} className={ui.ghost}>{t.previous}</Link>}
          <span className={ui.muted}>{t.page} {page} {t.of} {pages}</span>
          {page < pages && <Link href={href(page + 1)} className={ui.ghost}>{t.next}</Link>}
        </div>
      )}
    </div>
  );
}

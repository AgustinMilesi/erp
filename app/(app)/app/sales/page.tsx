import type { Metadata } from "next";
import Link from "next/link";
import type { SaleStatus } from "@prisma/client";
import { PageTitle } from "@/components/Headline";
import { ui } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getServerTranslations } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Sales" };

const PAGE_SIZE = 25;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const [{ organization }, { t }] = await Promise.all([
    requireSession(),
    getServerTranslations(),
  ]);
  const query = await searchParams;
  const status: SaleStatus | undefined =
    query.status === "COMPLETED" ? "COMPLETED" : query.status === "VOIDED" ? "VOIDED" : undefined;
  const page = Math.max(1, Number(query.page) || 1);

  const filters = [
    { label: t.all, value: "" },
    { label: t.filterCompleted, value: "COMPLETED" },
    { label: t.filterVoided, value: "VOIDED" },
  ] as const;

  const where = { organizationId: organization.id, ...(status ? { status } : {}) };

  const [sales, total] = await Promise.all([
    db.sale.findMany({
      where,
      orderBy: { number: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        number: true,
        status: true,
        totalCents: true,
        createdAt: true,
        contact: { select: { name: true } },
        cashier: { select: { name: true } },
      },
    }),
    db.sale.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number, s = status) => `/app/sales?${new URLSearchParams({ ...(s ? { status: s } : {}), page: String(p) })}`;

  const titleWords = t.yourSales.split(" ");
  const titleLight = titleWords[0];
  const titleBold = titleWords.slice(1).join(" ") ? `${titleWords.slice(1).join(" ")}.` : ".";

  return (
    <div className="space-y-10">
      <div>
        <PageTitle light={titleLight} bold={titleBold} />
        <p className={`${ui.muted} mt-2`}>{t.salesSubtitle}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {filters.map((filter) => (
          <Link
            key={filter.value}
            href={href(1, filter.value || undefined)}
            className={`${ui.ghost} ${(status ?? "") === filter.value ? "!border-rose-400 !text-rose-400" : ""}`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {sales.length === 0 ? (
        <p className={ui.muted}>
          {t.noSalesEmpty}{" "}
          <Link href="/app/pos" className={ui.link}>
            {t.openPosFirst}
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {sales.map((sale) => (
            <li key={sale.id}>
              <Link href={`/app/sales/${sale.id}`} className="flex items-center justify-between gap-4 py-4 hover:text-rose-400 transition">
                <span className="min-w-0">
                  <span className={`block truncate ${sale.status === "VOIDED" ? "text-slate-500 line-through" : "text-white"}`}>
                    {t.saleNumber}{sale.number}
                    {sale.status === "VOIDED" && <span className="ml-2 text-xs uppercase tracking-wider text-rose-400 no-underline font-mono">{t.voidedBadge}</span>}
                  </span>
                  <span className="block text-sm text-slate-500 truncate">
                    {formatDate(sale.createdAt)} · {sale.cashier.name}
                    {sale.contact ? ` · ${sale.contact.name}` : ""}
                  </span>
                </span>
                <span className={`whitespace-nowrap ${sale.status === "VOIDED" ? "text-slate-500" : "text-white"}`}>
                  {formatMoney(sale.totalCents, organization.currency, organization.showDecimals)}
                </span>
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

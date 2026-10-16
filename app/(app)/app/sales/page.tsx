import type { Metadata } from "next";
import Link from "next/link";
import type { SaleStatus } from "@prisma/client";
import { PageTitle } from "@/components/Headline";
import { ui } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Sales" };

const PAGE_SIZE = 25;
const FILTERS = [
  { label: "All", value: "" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Voided", value: "VOIDED" },
] as const;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { organization } = await requireSession();
  const query = await searchParams;
  const status: SaleStatus | undefined =
    query.status === "COMPLETED" ? "COMPLETED" : query.status === "VOIDED" ? "VOIDED" : undefined;
  const page = Math.max(1, Number(query.page) || 1);

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

  return (
    <div className="space-y-10">
      <PageTitle light="Your" bold="sales." />

      <div className="flex flex-wrap gap-3">
        {FILTERS.map((filter) => (
          <Link
            key={filter.label}
            href={href(1, filter.value || undefined)}
            className={`${ui.ghost} ${(status ?? "") === filter.value ? "!border-rose-400 !text-rose-400" : ""}`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {sales.length === 0 ? (
        <p className={ui.muted}>
          No sales yet. Open the <Link href="/pos" className={ui.link}>point of sale</Link> to make the first one.
        </p>
      ) : (
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {sales.map((sale) => (
            <li key={sale.id}>
              <Link href={`/app/sales/${sale.id}`} className="flex items-center justify-between gap-4 py-4 hover:text-rose-400 transition">
                <span className="min-w-0">
                  <span className={`block truncate ${sale.status === "VOIDED" ? "text-slate-500 line-through" : "text-white"}`}>
                    Sale #{sale.number}
                    {sale.status === "VOIDED" && <span className="ml-2 text-xs uppercase tracking-wider no-underline">Voided</span>}
                  </span>
                  <span className="block text-sm text-slate-500 truncate">
                    {formatDate(sale.createdAt)} · {sale.cashier.name}
                    {sale.contact ? ` · ${sale.contact.name}` : ""}
                  </span>
                </span>
                <span className={`whitespace-nowrap ${sale.status === "VOIDED" ? "text-slate-500" : "text-white"}`}>
                  {formatMoney(sale.totalCents, organization.currency)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center gap-4 text-sm">
          {page > 1 && <Link href={href(page - 1)} className={ui.ghost}>Previous</Link>}
          <span className={ui.muted}>Page {page} of {pages}</span>
          {page < pages && <Link href={href(page + 1)} className={ui.ghost}>Next</Link>}
        </div>
      )}
    </div>
  );
}

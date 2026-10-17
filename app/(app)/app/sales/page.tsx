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

  const href = (targetPage: number, newStatus?: string) => {
    const params = new URLSearchParams();
    const effectiveStatus = newStatus !== undefined ? newStatus : (status ?? "");
    if (effectiveStatus) {
      params.set("status", effectiveStatus);
    }
    if (targetPage > 1) {
      params.set("page", String(targetPage));
    }
    const qs = params.toString();
    return `/app/sales${qs ? `?${qs}` : ""}`;
  };

  const titleWords = t.yourSales.split(" ");
  const titleLight = titleWords[0];
  const titleBold = titleWords.slice(1).join(" ") ? `${titleWords.slice(1).join(" ")}.` : ".";

  return (
    <div className="space-y-8">
      <div>
        <PageTitle light={titleLight} bold={titleBold} />
        <p className={`${ui.muted} mt-2`}>{t.salesSubtitle}</p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => {
          const active = (status ?? "") === filter.value;
          return (
            <Link
              key={filter.value}
              href={href(1, filter.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition select-none ${
                active
                  ? "bg-rose-500/20 text-rose-300 border border-rose-400/50 shadow-sm"
                  : "bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/10"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {sales.length === 0 ? (
        <div className={`${ui.card} p-8 text-center space-y-2 border-white/10`}>
          <p className="text-white font-medium">{t.noSalesEmpty}</p>
          <p className="text-xs text-slate-400">
            <Link href="/app/pos" className="text-rose-400 hover:underline">
              {t.openPosFirst}
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {sales.map((sale) => (
              <li key={sale.id}>
                <Link
                  href={`/app/sales/${sale.id}`}
                  className="flex items-center justify-between gap-4 py-4 hover:bg-white/[0.02] px-2 rounded-xl transition"
                >
                  <span className="min-w-0">
                    <span
                      className={`block font-medium truncate ${
                        sale.status === "VOIDED" ? "text-slate-500 line-through" : "text-white"
                      }`}
                    >
                      {t.saleNumber}{sale.number}
                      {sale.status === "VOIDED" && (
                        <span className="ml-2 text-[11px] uppercase tracking-wider text-rose-400 no-underline font-mono px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                          {t.voidedBadge}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-slate-400 truncate mt-0.5">
                      {formatDate(sale.createdAt)} · {sale.cashier.name}
                      {sale.contact ? ` · ${sale.contact.name}` : ""}
                    </span>
                  </span>
                  <span
                    className={`font-mono font-bold text-sm sm:text-base whitespace-nowrap ${
                      sale.status === "VOIDED" ? "text-slate-500 line-through" : "text-white"
                    }`}
                  >
                    {formatMoney(sale.totalCents, organization.currency, organization.showDecimals)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Pagination Controls */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs">
              <div className="text-slate-400">
                Mostrando <span className="text-white font-mono font-bold">{(page - 1) * PAGE_SIZE + 1}</span> a{" "}
                <span className="text-white font-mono font-bold">{Math.min(page * PAGE_SIZE, total)}</span> de{" "}
                <span className="text-white font-mono font-bold">{total}</span> ventas
              </div>

              {pages > 1 && (
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link href={href(page - 1)} className={ui.ghost}>
                      ← Anterior
                    </Link>
                  ) : (
                    <span className={`${ui.ghost} opacity-30 cursor-not-allowed select-none`}>
                      ← Anterior
                    </span>
                  )}

                  <span className="text-slate-400 font-mono text-xs px-2">
                    {page} / {pages}
                  </span>

                  {page < pages ? (
                    <Link href={href(page + 1)} className={ui.ghost}>
                      Siguiente →
                    </Link>
                  ) : (
                    <span className={`${ui.ghost} opacity-30 cursor-not-allowed select-none`}>
                      Siguiente →
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

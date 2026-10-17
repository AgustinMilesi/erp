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
              className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 select-none border cursor-pointer ${
                active
                  ? "bg-gradient-to-r from-[#6852F6] to-[#5538EA] text-white border-transparent shadow-[0_8px_20px_rgba(85,56,234,0.32)] -translate-y-0.5"
                  : "bg-white text-[#72729A] hover:text-[#18182E] hover:bg-[#F8F9FE] border-[#EAE9F6] shadow-xs"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {sales.length === 0 ? (
        <div className="clay-card p-12 text-center space-y-3 rounded-3xl">
          <div className="size-14 rounded-3xl bg-[#EEF0FA] text-[#72729A] flex items-center justify-center mx-auto text-2xl">
            🧾
          </div>
          <p className="text-[#18182E] font-bold text-base">{t.noSalesEmpty}</p>
          <p className="text-xs text-[#72729A]">
            <Link href="/app/pos" className="text-[#5E48E8] font-bold hover:underline">
              {t.openPosFirst}
            </Link>
          </p>
        </div>
      ) : (
        <div className="clay-card p-6 sm:p-7 rounded-3xl space-y-4">
          <ul className="divide-y divide-[#EAE9F6]">
            {sales.map((sale) => (
              <li key={sale.id}>
                <Link
                  href={`/app/sales/${sale.id}`}
                  className="flex items-center justify-between gap-4 py-4 hover:bg-[#F8F9FE] px-3 rounded-2xl transition group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-10 rounded-2xl bg-[#EEF0FA] text-[#5E48E8] group-hover:bg-[#5E48E8] group-hover:text-white flex items-center justify-center text-sm font-bold transition shadow-xs">
                      🧾
                    </div>
                    <span className="min-w-0">
                      <span
                        className={`block font-bold text-sm truncate ${
                          sale.status === "VOIDED" ? "text-[#72729A] line-through" : "text-[#18182E] group-hover:text-[#5E48E8] transition"
                        }`}
                      >
                        {t.saleNumber}{sale.number}
                        {sale.status === "VOIDED" && (
                          <span className="ml-2 text-[10px] uppercase font-bold tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                            {t.voidedBadge}
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-[#72729A] truncate mt-0.5 font-medium">
                        {formatDate(sale.createdAt)} · {sale.cashier.name}
                        {sale.contact ? ` · ${sale.contact.name}` : ""}
                      </span>
                    </span>
                  </div>
                  <span
                    className={`font-mono font-black text-base whitespace-nowrap ${
                      sale.status === "VOIDED" ? "text-[#72729A] line-through" : "text-[#18182E]"
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-[#EAE9F6] text-xs">
              <div className="text-[#72729A]">
                Mostrando <span className="text-[#18182E] font-mono font-bold">{(page - 1) * PAGE_SIZE + 1}</span> a{" "}
                <span className="text-[#18182E] font-mono font-bold">{Math.min(page * PAGE_SIZE, total)}</span> de{" "}
                <span className="text-[#18182E] font-mono font-bold">{total}</span> ventas
              </div>

              {pages > 1 && (
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link
                      href={href(page - 1)}
                      className="px-4 py-2 rounded-full text-xs font-bold text-[#18182E] bg-white border border-[#EAE9F6] hover:bg-[#F8F9FE] shadow-xs transition"
                    >
                      ← Anterior
                    </Link>
                  ) : (
                    <span className="px-4 py-2 rounded-full text-xs font-bold text-[#72729A] bg-white/50 border border-[#EAE9F6] opacity-40 cursor-not-allowed select-none">
                      ← Anterior
                    </span>
                  )}

                  <span className="text-[#72729A] font-mono text-xs px-2 font-bold">
                    {page} / {pages}
                  </span>

                  {page < pages ? (
                    <Link
                      href={href(page + 1)}
                      className="px-4 py-2 rounded-full text-xs font-bold text-[#18182E] bg-white border border-[#EAE9F6] hover:bg-[#F8F9FE] shadow-xs transition"
                    >
                      Siguiente →
                    </Link>
                  ) : (
                    <span className="px-4 py-2 rounded-full text-xs font-bold text-[#72729A] bg-white/50 border border-[#EAE9F6] opacity-40 cursor-not-allowed select-none">
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

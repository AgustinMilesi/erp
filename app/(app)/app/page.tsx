import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/Headline";
import { ui } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getServerTranslations } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const [{ organization, user }, { t }] = await Promise.all([
    requireSession(),
    getServerTranslations(),
  ]);
  const orgId = organization.id;
  const money = (cents: number | bigint) =>
    formatMoney(cents, organization.currency, organization.showDecimals);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    todaySales,
    openSession,
    lowStockProducts,
    unread,
    contacts,
    recentSales,
  ] = await Promise.all([
    // Today completed sales aggregation
    db.sale.aggregate({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        createdAt: { gte: startOfToday },
      },
      _count: true,
      _sum: { totalCents: true },
    }),
    // Open cash session
    db.cashSession.findFirst({
      where: { organizationId: orgId, status: "OPEN" },
      select: { id: true, openedAt: true, openedBy: { select: { name: true } } },
    }),
    // Low stock warnings
    db.product.findMany({
      where: {
        organizationId: orgId,
        trackStock: true,
        active: true,
        stock: { lte: db.product.fields.minStock },
      },
      take: 5,
      select: { id: true, name: true, sku: true, stock: true, minStock: true },
    }),
    // Unread messages
    db.message.count({ where: { organizationId: orgId, status: "NEW" } }),
    // Total contacts
    db.contact.count({ where: { organizationId: orgId } }),
    // Recent sales
    db.sale.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        number: true,
        status: true,
        totalCents: true,
        createdAt: true,
        cashier: { select: { name: true } },
      },
    }),
  ]);

  const todayRevenue = todaySales._sum.totalCents ?? BigInt(0);

  return (
    <div className="space-y-8 animate-smooth-in">
      {/* 1. Header with greeting and live badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <PageTitle light={t.hi} bold={`${user.name.split(" ")[0]}.`} />
          <p className="text-sm text-[#72729A] mt-1 font-medium">
            {t.todayIn} <span className="font-semibold text-[#18182E]">{organization.name}</span>
          </p>
        </div>

        {/* Quick till indicator pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#EAE9F6] shadow-xs">
            <span className={`size-2.5 rounded-full ${openSession ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            <span className="text-xs font-bold text-[#18182E]">
              {openSession ? t.registerOpen : t.registerClosed}
            </span>
          </div>
          <Link
            href={openSession ? "/app/pos" : "/app/cash"}
            className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#6852F6] to-[#5538EA] shadow-[0_8px_20px_rgba(85,56,234,0.32)] hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span>⚡</span> {openSession ? t.openPosTill : t.openRegisterBtn}
          </Link>
        </div>
      </div>

      {/* 2. Top Hero Section: Signature Purple Clay Card + 3 Metric Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Purple Hero Card: Today's Revenue (Span 6) */}
        <div className="lg:col-span-6 clay-card-purple p-7 rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-[0_20px_40px_-10px_rgba(85,56,234,0.42)] group">
          {/* Subtle decorative circles inside card */}
          <div className="absolute -top-12 -right-12 size-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 size-48 bg-black/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                {t.todayRevenue}
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-md text-white border border-white/20">
                {organization.currency}
              </span>
            </div>

            <div className="mt-4">
              <p className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                {money(todayRevenue)}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-white/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-white font-mono font-bold text-[11px]">
                {todaySales._count} {t.completedSales}
              </span>
              <span className="text-white/80">en el día</span>
            </div>

            <Link
              href="/app/sales"
              className="text-xs font-bold text-white hover:text-white/90 underline underline-offset-4 flex items-center gap-1 transition"
            >
              <span>{t.viewSalesHistory}</span> →
            </Link>
          </div>
        </div>

        {/* 3 Secondary Clay Cards (Span 6) */}
        <div className="lg:col-span-6 grid sm:grid-cols-3 lg:grid-cols-1 gap-4">
          <Link
            href="/app/sales"
            className="clay-card p-5 rounded-3xl flex items-center justify-between gap-4 group"
          >
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[#72729A]">{t.todaySales}</p>
              <p className="text-3xl font-extrabold text-[#18182E] tracking-tight">{todaySales._count}</p>
              <p className="text-xs text-[#72729A]">{t.completedSales}</p>
            </div>
            <div className="size-12 rounded-2xl bg-[#EEF0FA] text-[#5E48E8] flex items-center justify-center text-xl font-bold group-hover:scale-110 group-hover:bg-[#5E48E8] group-hover:text-white transition-all shadow-xs">
              🛍️
            </div>
          </Link>

          <Link
            href="/app/inbox?status=NEW"
            className="clay-card p-5 rounded-3xl flex items-center justify-between gap-4 group"
          >
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[#72729A]">{t.newMessages}</p>
              <p className="text-3xl font-extrabold text-[#18182E] tracking-tight">{unread}</p>
              <p className="text-xs text-[#72729A]">{t.customerInbox}</p>
            </div>
            <div className="size-12 rounded-2xl bg-[#EEF0FA] text-[#5E48E8] flex items-center justify-center text-xl font-bold group-hover:scale-110 group-hover:bg-[#5E48E8] group-hover:text-white transition-all shadow-xs">
              💬
            </div>
          </Link>

          <Link
            href="/app/contacts"
            className="clay-card p-5 rounded-3xl flex items-center justify-between gap-4 group"
          >
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[#72729A]">{t.totalContacts}</p>
              <p className="text-3xl font-extrabold text-[#18182E] tracking-tight">{contacts}</p>
              <p className="text-xs text-[#72729A]">{t.customersAndLeads}</p>
            </div>
            <div className="size-12 rounded-2xl bg-[#EEF0FA] text-[#5E48E8] flex items-center justify-center text-xl font-bold group-hover:scale-110 group-hover:bg-[#5E48E8] group-hover:text-white transition-all shadow-xs">
              👥
            </div>
          </Link>
        </div>
      </div>

      {/* 3. Bottom Two Clay Cards: Latest Activity & Inventory Warnings */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Latest Sales Activity */}
        <section className="clay-card p-6 sm:p-7 rounded-3xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE9F6]">
            <div>
              <h2 className="text-base font-extrabold text-[#18182E] tracking-tight">{t.latestSales}</h2>
              <p className="text-xs text-[#72729A]">Transacciones recientes registradas</p>
            </div>
            <Link
              href="/app/sales"
              className="text-xs font-bold uppercase tracking-wider text-[#5E48E8] hover:text-[#4F38D8] transition"
            >
              {t.viewAll} →
            </Link>
          </div>

          {recentSales.length === 0 ? (
            <p className="text-xs text-[#72729A] italic py-8 text-center">{t.noSalesYet}</p>
          ) : (
            <ul className="divide-y divide-[#EAE9F6]">
              {recentSales.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/app/sales/${s.id}`}
                    className="flex items-center justify-between gap-4 py-3.5 hover:bg-[#F8F9FE] px-3 rounded-2xl transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-2xl bg-[#EEF0FA] group-hover:bg-[#5E48E8]/10 text-[#5E48E8] flex items-center justify-center text-sm font-bold transition">
                        🧾
                      </div>
                      <div className="min-w-0">
                        <span className={`block truncate text-sm font-bold ${s.status === "VOIDED" ? "text-[#72729A] line-through" : "text-[#18182E]"}`}>
                          {t.saleNumber}{s.number}
                          {s.status === "VOIDED" && (
                            <span className="ml-2 text-[10px] uppercase font-bold tracking-wider text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              {t.voidedBadge}
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-[#72729A] truncate">
                          {formatDate(s.createdAt)} · {s.cashier.name}
                        </span>
                      </div>
                    </div>
                    <span className={`text-sm font-extrabold font-mono whitespace-nowrap ${s.status === "VOIDED" ? "text-[#72729A]" : "text-[#18182E]"}`}>
                      {money(s.totalCents)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Low Stock Alerts */}
        <section className="clay-card p-6 sm:p-7 rounded-3xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE9F6]">
            <div>
              <h2 className="text-base font-extrabold text-[#18182E] tracking-tight">{t.lowStockAlerts}</h2>
              <p className="text-xs text-[#72729A]">Productos por debajo del stock mínimo</p>
            </div>
            <Link
              href="/app/products"
              className="text-xs font-bold uppercase tracking-wider text-[#5E48E8] hover:text-[#4F38D8] transition"
            >
              {t.allProducts} →
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <span className="text-2xl">✨</span>
              <p className="text-xs font-bold text-emerald-600">{t.allInventoryHealthy}</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#EAE9F6]">
              {lowStockProducts.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/app/products/${p.id}`}
                    className="flex items-center justify-between gap-4 py-3.5 hover:bg-[#F8F9FE] px-3 rounded-2xl transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">
                        ⚠️
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[#18182E] text-sm font-bold truncate group-hover:text-[#5E48E8] transition">
                          {p.name}
                        </span>
                        <span className="block text-xs text-[#72729A] font-mono truncate">{p.sku}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.stock <= 0 ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
                        {p.stock} {t.left}
                      </span>
                      <span className="block text-[11px] text-[#72729A] mt-1">{t.min} {p.minStock}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

